'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { upsertEvent, removeEvent, readAll } = require('./store');
const { startScheduler, sendTodaysMessages }  = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    const events = await readAll();
    res.json({ status: 'ok', events: events.length });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ─── Event sync (called by the mobile app) ────────────────────────────────────

/** Upsert an event — called on every create or update in the app */
app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    if (!event?.id) return res.status(400).json({ error: 'Missing event id' });
    await upsertEvent(event);
    console.log(`[API] Upserted event: "${event.title}" (${event.date})`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete an event — called when the user deletes in the app */
app.delete('/api/events/:id', async (req, res) => {
  try {
    await removeEvent(req.params.id);
    console.log(`[API] Deleted event: ${req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** List all stored events (useful for debugging) */
app.get('/api/events', async (_req, res) => {
  try {
    res.json(await readAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Manual trigger (for testing) ────────────────────────────────────────────

/**
 * POST /api/send-now
 * Immediately sends today's WhatsApp messages without waiting for the scheduler.
 */
app.post('/api/send-now', async (_req, res) => {
  try {
    await sendTodaysMessages();
    res.json({ ok: true, message: "Today's messages sent — check the server console for details." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  // If using PostgreSQL, initialise the table before accepting requests
  if (process.env.DATABASE_URL) {
    const { initDb } = require('./db');
    await initDb();
  }

  const PORT = process.env.PORT ?? 3001;
  app.listen(PORT, () => {
    console.log(`\nCelebConnect backend running on http://localhost:${PORT}`);
    console.log('Storage mode:', process.env.DATABASE_URL ? 'PostgreSQL' : 'local JSON file');
    console.log('Endpoints:');
    console.log(`  GET    /api/health       — check server status`);
    console.log(`  GET    /api/events       — list all synced events`);
    console.log(`  POST   /api/events       — upsert event (called by app)`);
    console.log(`  DELETE /api/events/:id   — delete event (called by app)`);
    console.log(`  POST   /api/send-now     — manually trigger today's messages\n`);
    startScheduler();
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
