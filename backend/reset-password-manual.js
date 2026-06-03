'use strict';
/**
 * Manual password reset script — run once to recover an account.
 * Usage: node reset-password-manual.js <email> <newPassword>
 *
 * Example: node reset-password-manual.js suneethakonjeti@gmail.com MyNewPass123
 */
require('dotenv').config();
const { getPool } = require('./db');

async function main() {
  const [,, email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error('Usage: node reset-password-manual.js <email> <newPassword>');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const pool = getPool();
  const { rowCount } = await pool.query(
    `UPDATE users SET data = data || $1 WHERE data->>'email' = $2`,
    [JSON.stringify({ passwordHash, updatedAt: new Date().toISOString() }), email]
  );

  if (rowCount === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Password reset for ${email}. You can now log in with your new password.`);
  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
