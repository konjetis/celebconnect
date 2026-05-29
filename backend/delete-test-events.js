'use strict';

/**
 * One-off script to delete old test events from the Railway PostgreSQL database.
 *
 * Run from the backend/ folder:
 *   node delete-test-events.js
 *
 * It will print what it finds, ask for confirmation, then delete.
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Titles to remove (case-insensitive substring match) ──────────────────────
const TITLES_TO_DELETE = [
  'anniversary dinner',
  'surya birthday',
];

async function main() {
  // Fetch all events
  const { rows } = await pool.query(
    "SELECT id, data->>'title' AS title, data->>'date' AS date FROM events ORDER BY date"
  );

  console.log(`\nAll events in DB (${rows.length} total):\n`);
  rows.forEach(r => console.log(`  ${r.id}  |  ${r.title}  |  ${r.date}`));

  const toDelete = rows.filter(r =>
    TITLES_TO_DELETE.some(t => r.title?.toLowerCase().includes(t))
  );

  if (toDelete.length === 0) {
    console.log('\nNo matching test events found. Nothing to delete.');
    await pool.end();
    return;
  }

  console.log(`\nFound ${toDelete.length} event(s) to delete:`);
  toDelete.forEach(r => console.log(`  ✗  ${r.title}  (${r.date})  [${r.id}]`));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nDelete these events? (yes/no): ', async answer => {
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted.');
      await pool.end();
      return;
    }

    for (const row of toDelete) {
      await pool.query('DELETE FROM events WHERE id = $1', [row.id]);
      console.log(`  ✅ Deleted: ${row.title}`);
    }

    const remaining = await pool.query(
      "SELECT COUNT(*) FROM events"
    );
    console.log(`\nDone. ${remaining.rows[0].count} event(s) remaining in DB.`);
    await pool.end();
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  pool.end();
  process.exit(1);
});
