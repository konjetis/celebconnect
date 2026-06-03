'use strict';
require('dotenv').config();
const { getPool } = require('./db');

async function main() {
  const pool = getPool();
  const { rows } = await pool.query('SELECT data FROM users');
  if (rows.length === 0) { console.log('No users found.'); }
  for (const row of rows) {
    const u = row.data;
    console.log(`id: ${u.id} | email: ${u.email ?? '—'} | phone: ${u.phone ?? '—'} | name: ${u.firstName} ${u.lastName}`);
  }
  await pool.end();
}
main().catch(err => { console.error(err.message); process.exit(1); });
