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
 * Creates the events table if it doesn't already exist.
 * Call this once on server startup.
 */
async function initDb() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id   TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);
  console.log('[DB] PostgreSQL table ready.');
}

module.exports = { getPool, initDb };
