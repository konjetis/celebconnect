'use strict';

/**
 * Event store — dual-mode:
 *   • Cloud  (DATABASE_URL set)  → PostgreSQL via 'pg'
 *   • Local  (no DATABASE_URL)   → JSON file at backend/data/events.json
 *
 * All exported functions are async so callers work the same in both modes.
 *
 * OWNERSHIP
 * ─────────
 * Every event belongs to exactly one user. Each function below takes a userId
 * and will only ever touch rows owned by that user. There is deliberately no
 * "read everything" helper exposed to request handlers — the only unscoped
 * reader is readAllForScheduler(), which the cron job uses and which returns
 * each event with its owner attached so notifications can be routed correctly.
 */

const fs   = require('fs');
const path = require('path');

// ─── Helpers shared by both modes ─────────────────────────────────────────────

function usePostgres() {
  return !!process.env.DATABASE_URL;
}

function requireUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('store: userId is required');
  }
  return userId;
}

// ─── PostgreSQL mode ──────────────────────────────────────────────────────────

async function pgReadAll(userId) {
  const { getPool } = require('./db');
  const { rows } = await getPool().query(
    "SELECT data FROM events WHERE user_id = $1 ORDER BY data->>'date'",
    [userId]
  );
  return rows.map(r => r.data);
}

async function pgUpsertEvent(event, userId) {
  const { getPool } = require('./db');
  // The WHERE clause makes this a no-op if the row exists and belongs to
  // somebody else — one user can never overwrite another's event by id.
  const { rowCount } = await getPool().query(
    `INSERT INTO events (id, data, user_id) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
     WHERE events.user_id = $3`,
    [event.id, JSON.stringify(event), userId]
  );
  return rowCount > 0;
}

async function pgRemoveEvent(id, userId) {
  const { getPool } = require('./db');
  const { rowCount } = await getPool().query(
    'DELETE FROM events WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCount > 0;
}

async function pgGetEventsForDate(dateString, userId) {
  const { getPool } = require('./db');
  const { rows } = await getPool().query(
    "SELECT data FROM events WHERE data->>'date' = $1 AND user_id = $2",
    [dateString, userId]
  );
  return rows.map(r => r.data);
}

async function pgReadAllForScheduler() {
  const { getPool } = require('./db');
  const { rows } = await getPool().query(
    "SELECT data, user_id FROM events WHERE user_id IS NOT NULL ORDER BY data->>'date'"
  );
  return rows.map(r => ({ ...r.data, userId: r.user_id }));
}

// ─── JSON file mode ───────────────────────────────────────────────────────────

const DATA_DIR    = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
}

function fileReadRaw() {
  ensureDataDir();
  try {
    const parsed = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function fileWriteRaw(events) {
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

async function fileReadAll(userId) {
  return fileReadRaw().filter(e => e.userId === userId);
}

async function fileUpsertEvent(event, userId) {
  const events = fileReadRaw();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) {
    // Refuse to overwrite an event owned by a different user.
    if (events[idx].userId !== userId) return false;
    events[idx] = { ...event, userId };
  } else {
    events.push({ ...event, userId });
  }
  fileWriteRaw(events);
  return true;
}

async function fileRemoveEvent(id, userId) {
  const events  = fileReadRaw();
  const kept    = events.filter(e => !(e.id === id && e.userId === userId));
  const removed = kept.length !== events.length;
  if (removed) fileWriteRaw(kept);
  return removed;
}

async function fileGetEventsForDate(dateString, userId) {
  return fileReadRaw().filter(e => e.date === dateString && e.userId === userId);
}

async function fileReadAllForScheduler() {
  return fileReadRaw().filter(e => !!e.userId);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** All events belonging to one user. */
async function readAll(userId) {
  requireUserId(userId);
  return usePostgres() ? pgReadAll(userId) : fileReadAll(userId);
}

/**
 * Create or update one of the user's events.
 * Returns false if the id already exists under a different owner.
 */
async function upsertEvent(event, userId) {
  requireUserId(userId);
  return usePostgres() ? pgUpsertEvent(event, userId) : fileUpsertEvent(event, userId);
}

/** Delete one of the user's events. Returns false if it wasn't theirs. */
async function removeEvent(id, userId) {
  requireUserId(userId);
  return usePostgres() ? pgRemoveEvent(id, userId) : fileRemoveEvent(id, userId);
}

/** The user's events falling on a given YYYY-MM-DD. */
async function getEventsForDate(dateString, userId) {
  requireUserId(userId);
  return usePostgres()
    ? pgGetEventsForDate(dateString, userId)
    : fileGetEventsForDate(dateString, userId);
}

/**
 * Every owned event across all users, each carrying its userId.
 * For the scheduler only — never expose this through an HTTP route.
 */
async function readAllForScheduler() {
  return usePostgres() ? pgReadAllForScheduler() : fileReadAllForScheduler();
}

/** Number of events stored, for the health check. Counts only owned rows. */
async function countAll() {
  return (await readAllForScheduler()).length;
}

module.exports = {
  upsertEvent,
  removeEvent,
  getEventsForDate,
  readAll,
  readAllForScheduler,
  countAll,
};
