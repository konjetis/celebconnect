'use strict';

const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');
const router  = express.Router();

// ─── Short-lived login code store ────────────────────────────────────────────
// Avoids putting a full JWT in the redirect URL (encoding issues on iOS).
// code → { token, user, expiresAt }
const pendingLogins = new Map();

function storeLoginCode(token, user) {
  const code      = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  pendingLogins.set(code, { token, user, expiresAt });
  return code;
}

// Purge expired codes to avoid memory leaks
function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of pendingLogins) {
    if (v.expiresAt < now) pendingLogins.delete(k);
  }
}

// ─── Webhook Verification (GET) ───────────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('[Instagram] Webhook verified!');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Verification failed' });
});

// ─── Incoming Messages (POST) ─────────────────────────────────────────────────
router.post('/webhook', (req, res) => {
  const body = req.body;
  res.status(200).send('EVENT_RECEIVED');
  if (body.object !== 'instagram') return;
  for (const entry of (body.entry || [])) {
    for (const event of (entry.messaging || [])) {
      if (event.message?.text) {
        console.log(`[Instagram] Message from ${event.sender?.id}: "${event.message.text}"`);
      }
    }
  }
});

// ─── OAuth Start ──────────────────────────────────────────────────────────────
// GET /api/instagram — redirect browser to Instagram authorization page
router.get('/', (req, res) => {
  const appId       = process.env.INSTAGRAM_APP_ID;
  const redirectUri = 'https://celebconnect-production.up.railway.app/api/instagram/callback';
  // New Instagram Business API uses instagram.com/oauth/authorize + instagram_business_basic scope
  const scope       = 'instagram_business_basic';
  const url         = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  res.redirect(url);
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────
// GET /api/instagram/callback — exchange code for token, fetch profile,
// find-or-create CelebConnect user, issue our own JWT, deep-link back to app.
router.get('/callback', async (req, res) => {
  const { code, error: igError } = req.query;

  if (igError) {
    // User denied permission
    return res.redirect('celebconnect://instagram-callback?error=cancelled');
  }
  if (!code) {
    return res.redirect('celebconnect://instagram-callback?error=no_code');
  }

  try {
    // 1. Exchange code for short-lived access token
    const params = new URLSearchParams({
      client_id:     process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      grant_type:    'authorization_code',
      redirect_uri:  'https://celebconnect-production.up.railway.app/api/instagram/callback',
      code,
    });

    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, user_id } = tokenRes.data;

    // 2. Fetch real Instagram profile (new API uses /me endpoint)
    const profileRes = await axios.get(
      'https://graph.instagram.com/me',
      { params: { fields: 'id,username,name', access_token } }
    );
    const { username, name } = profileRes.data;

    // 3. Find or create a CelebConnect user for this Instagram account
    const { getAllUsers, saveUser: _saveUser } = require('./auth');
    const crypto = require('crypto');

    // saveUser isn't exported — pull it from the module internals via the router's closure.
    // Instead, use the DB helpers directly.
    const allUsers = await getAllUsers();
    let user = allUsers.find(u => u.instagramId === String(user_id));

    if (!user) {
      // New Instagram user — create a CelebConnect account
      const now = new Date().toISOString();
      const nameParts = (name || username || '').split(' ');
      user = {
        id:          crypto.randomUUID(),
        firstName:   nameParts[0] || username,
        lastName:    nameParts.slice(1).join(' ') || '',
        instagramId: String(user_id),
        instagramHandle: username,
        profilePhoto: undefined,
        createdAt:   now,
        updatedAt:   now,
      };

      // Save via DB helper
      const { getPool } = require('./db');
      if (process.env.DATABASE_URL) {
        await getPool().query(
          `INSERT INTO users (id, data) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [user.id, JSON.stringify(user)]
        );
      }
    }

    // 4. Issue a CelebConnect JWT
    const jwt        = require('jsonwebtoken');
    const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? 'REPLACE_WITH_A_LONG_RANDOM_SECRET';
    const ourToken   = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });

    // Strip passwordHash before storing user in memory
    const { passwordHash: _pw, ...safeUser } = user;

    // 5. Store token+user under a short code; redirect with just the code.
    //    This avoids putting a full JWT in the URL (iOS encoding issues).
    purgeExpired();
    const loginCode = storeLoginCode(ourToken, safeUser);

    console.log(`[Instagram] Login success for @${username} (user ${user.id})`);

    res.redirect(`celebconnect://instagram-callback?code=${loginCode}`);
  } catch (err) {
    console.error('[Instagram] OAuth error:', err.response?.data || err.message);
    res.redirect('celebconnect://instagram-callback?error=server_error');
  }
});

// ─── Code Exchange ────────────────────────────────────────────────────────────
// GET /api/instagram/exchange?code=<loginCode>
// App calls this after receiving the code from the deep link.
// Returns { token, user } and consumes the code (one-time use).
router.get('/exchange', (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code is required' });

  const entry = pendingLogins.get(code);
  if (!entry) return res.status(400).json({ error: 'Invalid or expired login code' });
  if (entry.expiresAt < Date.now()) {
    pendingLogins.delete(code);
    return res.status(400).json({ error: 'Login code expired' });
  }

  pendingLogins.delete(code); // one-time use
  res.json({ token: entry.token, user: entry.user });
});

module.exports = router;
