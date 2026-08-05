'use strict';

/**
 * Integration tests for the /api/events routes.
 *
 * These are regression tests for the pre-1.0 security bug where the event
 * routes were completely unauthenticated and operated on a single global
 * event collection. Any caller could:
 *   • GET  /api/events      → dump every user's events, contacts and phone numbers
 *   • POST /api/events      → overwrite any event by reusing its id
 *   • DELETE /api/events/:id → delete any user's event
 *
 * Every test below must keep passing. If one starts failing, user data is
 * leaking across accounts.
 */

const express = require('express');
const request = require('supertest');
const path    = require('path');
const fs      = require('fs');

// In-memory / file mode, deterministic JWT secret — set before requiring anything
delete process.env.DATABASE_URL;
process.env.AUTH_JWT_SECRET = 'ci-test-secret-not-real';

const { router: authRouter, requireAuth } = require('../auth');
const { upsertEvent, removeEvent, readAll } = require('../store');

const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

// Rebuild the same event routes the real server mounts.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  app.post('/api/events', requireAuth, async (req, res) => {
    try {
      const event = req.body;
      if (!event?.id) return res.status(400).json({ error: 'Missing event id' });
      const { userId: _ignored, ...clean } = event;
      const ok = await upsertEvent(clean, req.user.id);
      if (!ok) return res.status(403).json({ error: 'Event belongs to another user' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/events/:id', requireAuth, async (req, res) => {
    try {
      const removed = await removeEvent(req.params.id, req.user.id);
      if (!removed) return res.status(404).json({ error: 'Event not found' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/events', requireAuth, async (req, res) => {
    try {
      res.json(await readAll(req.user.id));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

let counter = 0;
async function registerUser(app) {
  const email = `evt${++counter}_${Date.now()}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    firstName: 'Test',
    lastName:  'User',
    email,
    password:  'password123',
    method:    'email',
  });
  expect(res.status).toBe(201);
  return { token: res.body.token, id: res.body.user.id, email };
}

const sampleEvent = (overrides = {}) => ({
  id: 'evt-' + Math.random().toString(36).slice(2),
  title: "Mum's Birthday",
  date: '2026-06-01',
  category: 'birthday',
  recurrence: 'yearly',
  contacts: [{ id: 'c1', name: 'Mum', phone: '+15550001111' }],
  whatsappEnabled: true,
  instagramEnabled: false,
  notifyDaysBefore: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  if (fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
});

afterAll(() => {
  if (fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
});

// ─── Authentication is required ───────────────────────────────────────────────

describe('/api/events — authentication', () => {
  it('rejects GET without a token', async () => {
    const res = await request(buildApp()).get('/api/events');
    expect(res.status).toBe(401);
  });

  it('rejects POST without a token', async () => {
    const res = await request(buildApp()).post('/api/events').send(sampleEvent());
    expect(res.status).toBe(401);
  });

  it('rejects DELETE without a token', async () => {
    const res = await request(buildApp()).delete('/api/events/anything');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(buildApp())
      .get('/api/events')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('/api/events — owner access', () => {
  it('round-trips an event for its owner', async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const event = sampleEvent();

    const post = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(event);
    expect(post.status).toBe(200);

    const get = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(get.status).toBe(200);
    expect(get.body).toHaveLength(1);
    expect(get.body[0].id).toBe(event.id);
  });

  it('lets the owner update and then delete their event', async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const event = sampleEvent({ title: 'Original' });
    const auth  = { Authorization: `Bearer ${alice.token}` };

    await request(app).post('/api/events').set(auth).send(event);
    await request(app).post('/api/events').set(auth).send({ ...event, title: 'Updated' });

    let get = await request(app).get('/api/events').set(auth);
    expect(get.body).toHaveLength(1);
    expect(get.body[0].title).toBe('Updated');

    const del = await request(app).delete(`/api/events/${event.id}`).set(auth);
    expect(del.status).toBe(200);

    get = await request(app).get('/api/events').set(auth);
    expect(get.body).toHaveLength(0);
  });

  it('ignores a client-supplied userId and uses the token holder', async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const bob   = await registerUser(app);

    // Alice tries to plant an event in Bob's account
    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(sampleEvent({ id: 'planted', userId: bob.id }));

    const bobsEvents = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(bobsEvents.body).toHaveLength(0);

    const alicesEvents = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(alicesEvents.body).toHaveLength(1);
  });
});

// ─── Cross-user isolation ─────────────────────────────────────────────────────

describe('/api/events — cross-user isolation', () => {
  it("GET never returns another user's events", async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const bob   = await registerUser(app);

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(sampleEvent({ title: "Alice's Mum", contacts: [{ id: 'c1', name: 'Mum', phone: '+15550001111' }] }));

    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    // Belt and braces: Alice's contact phone number must appear nowhere
    expect(JSON.stringify(res.body)).not.toContain('+15550001111');
  });

  it("POST cannot overwrite another user's event by reusing its id", async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const bob   = await registerUser(app);

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(sampleEvent({ id: 'shared-id', title: "Alice's private event" }));

    const hijack = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${bob.token}`)
      .send(sampleEvent({ id: 'shared-id', title: 'Hijacked' }));

    expect(hijack.status).toBe(403);

    const alicesEvents = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(alicesEvents.body).toHaveLength(1);
    expect(alicesEvents.body[0].title).toBe("Alice's private event");
  });

  it("DELETE cannot remove another user's event", async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const bob   = await registerUser(app);

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(sampleEvent({ id: 'alices-event' }));

    const del = await request(app)
      .delete('/api/events/alices-event')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(del.status).toBe(404);

    const alicesEvents = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(alicesEvents.body).toHaveLength(1);
  });

  it('two users can hold events with independent data at the same time', async () => {
    const app   = buildApp();
    const alice = await registerUser(app);
    const bob   = await registerUser(app);

    await request(app).post('/api/events')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(sampleEvent({ id: 'a-1', title: "Alice's" }));

    await request(app).post('/api/events')
      .set('Authorization', `Bearer ${bob.token}`)
      .send(sampleEvent({ id: 'b-1', title: "Bob's" }));

    const a = await request(app).get('/api/events').set('Authorization', `Bearer ${alice.token}`);
    const b = await request(app).get('/api/events').set('Authorization', `Bearer ${bob.token}`);

    expect(a.body.map(e => e.id)).toEqual(['a-1']);
    expect(b.body.map(e => e.id)).toEqual(['b-1']);
  });
});
