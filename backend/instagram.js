'use strict';

const express = require('express');
const axios   = require('axios');
const router  = express.Router();

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
// GET /api/auth/instagram — redirect browser to Instagram authorization page
router.get('/auth/instagram', (req, res) => {
  const appId       = process.env.INSTAGRAM_APP_ID;
  const redirectUri = 'https://celebconnect-production.up.railway.app/api/auth/instagram/callback';
  const scope       = 'user_profile,user_media';
  const url         = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  res.redirect(url);
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────
// GET /api/auth/instagram/callback — exchange code for token, fetch profile,
// find-or-create CelebConnect user, issue our own JWT, deep-link back to app.
router.get('/auth/instagram/callback', async (req, res) => {
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
      redirect_uri:  'https://celebconnect-production.up.railway.app/api/auth/instagram/callback',
      code,
    });

    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, user_id } = tokenRes.data;

    // 2. Fetch real Instagram profile
    const profileRes = await axios.get(
      `https://graph.instagram.com/${user_id}`,
      { params: { fields: 'id,username', access_token } }
    );
    const { username } = profileRes.data;

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
      user = {
        id:          crypto.randomUUID(),
        firstName:   username,
        lastName:    '',
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

    console.log(`[Instagram] Login success for @${username} (user ${user.id})`);

    // 5. Deep-link back to the app with our JWT
    res.redirect(`celebconnect://instagram-callback?token=${ourToken}`);
  } catch (err) {
    console.error('[Instagram] OAuth error:', err.response?.data || err.message);
    res.redirect('celebconnect://instagram-callback?error=server_error');
  }
});

module.exports = router;
