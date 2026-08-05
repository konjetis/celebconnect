'use strict';

/**
 * PostgreSQL connection pool.
 * Uses the DATABASE_URL environment variable (automatically set by Railway).
 * Falls back to a local JSON file store if DATABASE_URL is not set.
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Creates the events table if it doesn't already exist and applies pending
 * migrations. Call this once on server startup.
 */
async function initDb() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id   TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);

  // ─── Migration: per-user event ownership ───────────────────────────────────
  // Events were originally stored in one global collection with no owner, which
  // meant every user could read, overwrite and delete every other user's events.
  // user_id scopes them. Existing rows are adopted by ADOPT_ORPHAN_EVENTS_USER_ID
  // if set, otherwise they are left NULL and are invisible to every user.
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id TEXT');
  await db.query('CREATE INDEX IF NOT EXISTS events_user_id_idx ON events (user_id)');

  const adoptUserId = process.env.ADOPT_ORPHAN_EVENTS_USER_ID;
  if (adoptUserId) {
    const { rowCount } = await db.query(
      'UPDATE events SET user_id = $1 WHERE user_id IS NULL',
      [adoptUserId]
    );
    if (rowCount > 0) {
      console.log(`[DB] Migration: assigned ${rowCount} orphan event(s) to user ${adoptUserId}.`);
    }
  } else {
    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS n FROM events WHERE user_id IS NULL'
    );
    if (rows[0].n > 0) {
      console.warn(
        `[DB] ⚠️  ${rows[0].n} event(s) have no owner and are hidden from all users. ` +
        'Set ADOPT_ORPHAN_EVENTS_USER_ID to the owning user id and restart to claim them.'
      );
    }
  }

  console.log('[DB] PostgreSQL tables ready.');
}

module.exports = { getPool, initDb };
