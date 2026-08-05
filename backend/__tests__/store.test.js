'use strict';

/**
 * Tests for the file-based (JSON) store mode.
 * DATABASE_URL is not set so the file store is used automatically.
 */

const path = require('path');
const fs   = require('fs');

// Path to the actual events file the store uses
const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

delete process.env.DATABASE_URL;

const store = require('../store');

const ALICE = 'user-alice';
const BOB   = 'user-bob';

// Wipe events before each test so tests are isolated
beforeEach(() => {
  if (fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
  }
});

afterAll(() => {
  // Leave the file clean after the suite
  if (fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
  }
});

describe('File-based event store', () => {
  it('readAll returns empty array when no events exist', async () => {
    const events = await store.readAll(ALICE);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(0);
  });

  it('upsertEvent inserts a new event', async () => {
    const event = { id: 'evt-1', title: "Mum's Birthday", date: '2026-06-01', recurrence: 'yearly' };
    await store.upsertEvent(event, ALICE);
    const events = await store.readAll(ALICE);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt-1');
    expect(events[0].title).toBe("Mum's Birthday");
  });

  it('upsertEvent updates an existing event', async () => {
    const event = { id: 'evt-1', title: 'Original', date: '2026-06-01', recurrence: 'none' };
    await store.upsertEvent(event, ALICE);
    await store.upsertEvent({ ...event, title: 'Updated' }, ALICE);
    const events = await store.readAll(ALICE);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Updated');
  });

  it('removeEvent removes the correct event', async () => {
    await store.upsertEvent({ id: 'evt-1', title: 'Keep', date: '2026-05-01' }, ALICE);
    await store.upsertEvent({ id: 'evt-2', title: 'Delete', date: '2026-06-01' }, ALICE);
    await store.removeEvent('evt-2', ALICE);
    const events = await store.readAll(ALICE);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt-1');
  });

  it('getEventsForDate returns events on the given date only', async () => {
    await store.upsertEvent({ id: 'evt-1', title: 'Today', date: '2026-04-23' }, ALICE);
    await store.upsertEvent({ id: 'evt-2', title: 'Tomorrow', date: '2026-04-24' }, ALICE);
    const todayEvents = await store.getEventsForDate('2026-04-23', ALICE);
    expect(todayEvents).toHaveLength(1);
    expect(todayEvents[0].id).toBe('evt-1');
  });

  it('getEventsForDate returns empty array when no events on date', async () => {
    const events = await store.getEventsForDate('2099-12-31', ALICE);
    expect(events).toHaveLength(0);
  });

  it('handles multiple events correctly', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.upsertEvent({ id: `evt-${i}`, title: `Event ${i}`, date: `2026-0${i}-01` }, ALICE);
    }
    const all = await store.readAll(ALICE);
    expect(all).toHaveLength(5);
  });

  it('requires a userId', async () => {
    await expect(store.readAll()).rejects.toThrow(/userId is required/);
    await expect(store.upsertEvent({ id: 'x' })).rejects.toThrow(/userId is required/);
    await expect(store.removeEvent('x')).rejects.toThrow(/userId is required/);
    await expect(store.getEventsForDate('2026-01-01')).rejects.toThrow(/userId is required/);
  });
});

// ─── Cross-user isolation ─────────────────────────────────────────────────────
// Regression tests for the pre-1.0 bug where events lived in one global
// collection with no owner, so any user could read, overwrite or delete any
// other user's events (and their contacts' phone numbers).

describe('Event store — cross-user isolation', () => {
  it('readAll never returns another user\'s events', async () => {
    await store.upsertEvent({ id: 'a-1', title: "Alice's Mum", date: '2026-06-01' }, ALICE);
    await store.upsertEvent({ id: 'b-1', title: "Bob's Dad",   date: '2026-06-01' }, BOB);

    const aliceEvents = await store.readAll(ALICE);
    const bobEvents   = await store.readAll(BOB);

    expect(aliceEvents.map(e => e.id)).toEqual(['a-1']);
    expect(bobEvents.map(e => e.id)).toEqual(['b-1']);
  });

  it('getEventsForDate never returns another user\'s events', async () => {
    await store.upsertEvent({ id: 'a-1', title: "Alice's", date: '2026-06-01' }, ALICE);
    await store.upsertEvent({ id: 'b-1', title: "Bob's",   date: '2026-06-01' }, BOB);

    const forAlice = await store.getEventsForDate('2026-06-01', ALICE);
    expect(forAlice).toHaveLength(1);
    expect(forAlice[0].id).toBe('a-1');
  });

  it('one user cannot overwrite another user\'s event by reusing its id', async () => {
    await store.upsertEvent(
      { id: 'shared-id', title: "Alice's private event", date: '2026-06-01' },
      ALICE
    );

    const ok = await store.upsertEvent(
      { id: 'shared-id', title: 'Hijacked by Bob', date: '2026-06-01' },
      BOB
    );

    expect(ok).toBe(false);

    const aliceEvents = await store.readAll(ALICE);
    expect(aliceEvents).toHaveLength(1);
    expect(aliceEvents[0].title).toBe("Alice's private event");

    // And Bob gained nothing
    expect(await store.readAll(BOB)).toHaveLength(0);
  });

  it('one user cannot delete another user\'s event', async () => {
    await store.upsertEvent({ id: 'a-1', title: "Alice's", date: '2026-06-01' }, ALICE);

    const removed = await store.removeEvent('a-1', BOB);

    expect(removed).toBe(false);
    expect(await store.readAll(ALICE)).toHaveLength(1);
  });

  it('removeEvent reports false for an event that does not exist', async () => {
    expect(await store.removeEvent('nope', ALICE)).toBe(false);
  });

  it('readAllForScheduler returns every owned event tagged with its owner', async () => {
    await store.upsertEvent({ id: 'a-1', title: "Alice's", date: '2026-06-01' }, ALICE);
    await store.upsertEvent({ id: 'b-1', title: "Bob's",   date: '2026-06-02' }, BOB);

    const all = await store.readAllForScheduler();
    expect(all).toHaveLength(2);
    expect(all.find(e => e.id === 'a-1').userId).toBe(ALICE);
    expect(all.find(e => e.id === 'b-1').userId).toBe(BOB);
  });

  it('readAllForScheduler ignores orphan events with no owner', async () => {
    // Simulate a pre-migration row written before user_id existed
    fs.writeFileSync(
      EVENTS_FILE,
      JSON.stringify([{ id: 'orphan', title: 'Legacy', date: '2026-06-01' }], null, 2),
      'utf8'
    );

    expect(await store.readAllForScheduler()).toHaveLength(0);
    expect(await store.readAll(ALICE)).toHaveLength(0);
  });
});
