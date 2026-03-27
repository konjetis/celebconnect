'use strict';

/**
 * Event store — dual-mode:
 *   • Cloud  (DATABASE_URL set)  → PostgreSQL via 'pg'
 *   • Local  (no DATABASE_URL)   → JSON file at backend/data/events.json
 *
 * All exported functions are async so callers work the same in both modes.
 */

const fs   = require('fs');
const path = require('path');

// ─── Helpers shared by both modes ─────────────────────────────────────────────

function usePostgres() {
  return !!process.env.DATABASE_URL;
}

// ─── PostgreSQL mode ──────────────────────────────────────────────────────────

async function pgReadAll() {
  const { getPool } = require('./db');
  const { rows } = await getPool().query(
    "SELECT data FROM events ORDER BY data->>'date'"
  );
  return rows.map(r => r.data);
}

async function pgUpsertEvent(event) {
  const { getPool } = require('./db');
  await getPool().query(
    `INSERT INTO events (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [event.id, JSON.stringify(event)]
  );
}

async function pgRemoveEvent(id) {
  const { getPool } = require('./db');
  await getPool().query('DELETE FROM events WHERE id = $1', [id]);
}

async function pgGetEventsForDate(dateString) {
  const { getPool } = require('./db');
  const { rows } = await getPool().query(
    "SELECT data FROM events WHERE data->>'date' = $1",
    [dateString]
  );
  return rows.map(r => r.data);
}

// ─── JSON file mode ───────────────────────────────────────────────────────────

const DATA_DIR    = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
}

async function fileReadAll() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')); }
  catch { return []; }
}

async function fileUpsertEvent(event) {
  const events = await fileReadAll();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event; else events.push(event);
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

async function fileRemoveEvent(id) {
  const events = (await fileReadAll()).filter(e => e.id !== id);
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

async function fileGetEventsForDate(dateString) {
  return (await fileReadAll()).filter(e => e.date === dateString);
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function readAll() {
  return usePostgres() ? pgReadAll() : fileReadAll();
}

async function upsertEvent(event) {
  return usePostgres() ? pgUpsertEvent(event) : fileUpsertEvent(event);
}

async function removeEvent(id) {
  return usePostgres() ? pgRemoveEvent(id) : fileRemoveEvent(id);
}

async function getEventsForDate(dateString) {
  return usePostgres() ? pgGetEventsForDate(dateString) : fileGetEventsForDate(dateString);
}

module.exports = { upsertEvent, removeEvent, getEventsForDate, readAll };
