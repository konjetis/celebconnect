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

// ─── Password reset token store ───────────────────────────────────────────────
// Maps token → { userId, expiresAt }
// In-memory is fine — tokens are short-lived (1 hr) and non-critical to persist.

const resetTokens = new Map();

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function storeResetToken(userId) {
  const token     = generateResetToken();
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  resetTokens.set(token, { userId, expiresAt });
  return token;
}

function consumeResetToken(token) {
  const entry = resetTokens.get(token);
  if (!entry) return null;
  resetTokens.delete(token); // one-time use
  if (Date.now() > entry.expiresAt) return null; // expired
  return entry.userId;
}

// Expose for tests
function _resetTokenStore() { return resetTokens; }

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

async function getAllUsers() {
  if (usePostgres()) {
    const { getPool } = require('./db');
    const { rows } = await getPool().query('SELECT data FROM users');
    return rows.map(r => r.data);
  }
  return Array.from(users.values());
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
    if (user && user.email) {
      const token = storeResetToken(user.id);
      const { sendResetEmail } = require('./email');
      await sendResetEmail(user.email, token);
    }

    res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[Auth] forgot-password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const userId = consumeResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const user = await findUserById(userId);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const bcrypt = requireBcrypt();
    const passwordHash = await bcrypt.hash(password, 12);
    await saveUser({ ...user, passwordHash, updatedAt: new Date().toISOString() });

    console.log(`[Auth] Password reset successful for user ${userId}`);
    res.json({ ok: true, message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('[Auth] reset-password error:', err);
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

// POST /api/auth/push-token — save Expo push token for this user
router.post('/push-token', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    const updated = { ...req.user, expoPushToken: token };
    await saveUser(updated);
    console.log(`[Auth] Push token saved for user ${req.user.id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Auth] push-token error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/profile-photo — multipart upload → Cloudinary
//
// Requires these env vars (set in Railway dashboard):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//
// Client sends:  multipart/form-data  with field name "photo"
// Response:      { ok: true, url: "https://res.cloudinary.com/..." }
{
  const multer     = require('multer');
  const cloudinary = require('cloudinary').v2;
  const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

  router.post('/profile-photo', requireAuth, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided (field name: "photo")' });
      }

      // Graceful error if Cloudinary is not yet configured.
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({
          error: 'Profile photo upload not configured.',
          hint:  'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Railway environment.',
        });
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Upload buffer via upload_stream
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         'celebconnect/avatars',
            public_id:      `user_${req.user.id}`,
            overwrite:      true,
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        stream.end(req.file.buffer);
      });

      const url = uploadResult.secure_url;
      await saveUser({ ...req.user, profilePhoto: url, updatedAt: new Date().toISOString() });

      console.log(`[Auth] Profile photo updated for user ${req.user.id}: ${url}`);
      res.json({ ok: true, url });
    } catch (err) {
      console.error('[Auth] profile-photo error:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

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

module.exports = { router, initUsersTable, getAllUsers, _resetTokenStore, storeResetToken, consumeResetToken };
