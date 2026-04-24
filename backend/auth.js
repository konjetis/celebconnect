'use strict';

/**
 * Auth routes for CelebConnect.
 *
 * Endpoints:
 *   POST /api/auth/login           — sign in, returns { user, token }
 *   POST /api/auth/register        — create account, returns { user, token }
 *   POST /api/auth/forgot-password — send reset link
 *   GET  /api/auth/me              — validate token, returns user
 *   PATCH /api/auth/profile        — update profile fields
 *   POST /api/auth/profile-photo   — upload profile photo
 *
 * Tokens: signed JWT (HS256). Secret is AUTH_JWT_SECRET in .env.
 * Passwords: bcrypt-hashed before storage.
 */

const crypto  = require('crypto');
const express = require('express');

// ─── Lazy-load optional deps so the server still starts without them ───────────

function requireBcrypt() {
  try { return require('bcryptjs'); }
  catch { throw new Error('bcryptjs not installed. Run: npm install bcryptjs'); }
}

function requireJwt() {
  try { return require('jsonwebtoken'); }
  catch { throw new Error('jsonwebtoken not installed. Run: npm install jsonwebtoken'); }
}

// ─── In-memory user store (replaced by DB in production) ──────────────────────

const users = new Map(); // id → user record (includes passwordHash)

function usePostgres() {
  return !!process.env.DATABASE_URL;
}

async function findUserByIdentifier(identifier) {
  if (usePostgres()) {
    const { getPool } = require('./db');
    const { rows } = await getPool().query(
      `SELECT data FROM users
       WHERE data->>'email' = $1 OR data->>'phone' = $1
       LIMIT 1`,
      [identifier]
    );
    return rows[0]?.data ?? null;
  }
  for (const u of users.values()) {
    if (u.email === identifier || u.phone === identifier) return u;
  }
  return null;
}

async function findUserById(id) {
  if (usePostgres()) {
    const { getPool } = require('./db');
    const { rows } = await getPool().query(
      'SELECT data FROM users WHERE id = $1',
      [id]
    );
    return rows[0]?.data ?? null;
  }
  return users.get(id) ?? null;
}

async function saveUser(user) {
  if (usePostgres()) {
    const { getPool } = require('./db');
    await getPool().query(
      `INSERT INTO users (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [user.id, JSON.stringify(user)]
    );
  } else {
    users.set(user.id, user);
  }
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? 'REPLACE_WITH_A_LONG_RANDOM_SECRET';
const JWT_EXPIRY = '30d';

function signToken(userId) {
  const jwt = requireJwt();
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  const jwt = requireJwt();
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired
}

function extractToken(req) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Sanitise user for response (strip passwordHash) ─────────────────────────

function publicUser(user) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const bcrypt = requireBcrypt();
    const { firstName, lastName, email, phone, password, method } = req.body;

    if (!firstName || !lastName || !password) {
      return res.status(400).json({ error: 'firstName, lastName, and password are required' });
    }

    const identifier = method === 'email' ? email : phone;
    if (!identifier) {
      return res.status(400).json({ error: `${method} is required` });
    }

    const existing = await findUserByIdentifier(identifier);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email/phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      email:    method === 'email' ? email : undefined,
      phone:    method === 'phone' ? phone : undefined,
      profilePhoto: undefined,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await saveUser(user);
    const token = signToken(user.id);

    res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    console.error('[Auth] register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const bcrypt = requireBcrypt();
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier and password are required' });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    res.json({ user: publicUser(user), token });
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: 'identifier is required' });

    // Always return 200 to prevent account enumeration
    const user = await findUserByIdentifier(identifier);
    if (user) {
      // TODO: Send reset email/SMS via your email/SMS provider
      // Example: await sendResetEmail(user.email, resetToken);
      console.log(`[Auth] Password reset requested for: ${identifier}`);
    }

    res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[Auth] forgot-password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — validate token
router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// PATCH /api/auth/profile — update name/email/phone
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const updated = {
      ...req.user,
      ...(firstName !== undefined && { firstName }),
      ...(lastName  !== undefined && { lastName }),
      ...(email     !== undefined && { email }),
      ...(phone     !== undefined && { phone }),
      updatedAt: new Date().toISOString(),
    };
    await saveUser(updated);
    res.json(publicUser(updated));
  } catch (err) {
    console.error('[Auth] profile update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/profile-photo — multipart upload
router.post('/profile-photo', requireAuth, async (req, res) => {
  // TODO: Integrate with your file storage (S3, Cloudinary, etc.)
  // For now return a placeholder response so the client doesn't crash.
  res.status(501).json({
    error: 'Profile photo upload not yet configured on this server.',
    hint: 'Integrate with Cloudinary or S3 and update backend/auth.js /profile-photo route.',
  });
});

// ─── DB schema for users table ────────────────────────────────────────────────

async function initUsersTable() {
  if (!usePostgres()) return;
  const { getPool } = require('./db');
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id   TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);
  console.log('[DB] Users table ready.');
}

module.exports = { router, initUsersTable };
