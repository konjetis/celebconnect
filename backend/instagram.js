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

// ─── OAuth Callback ───────────────────────────────────────────────────────────
router.get('/auth/instagram/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
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
    console.log(`[Instagram] Login success! User ID: ${user_id}`);

    // Redirect back to the app with the token
    res.redirect(`celebconnect://instagram-callback?token=${access_token}&userId=${user_id}`);
  } catch (err) {
    console.error('[Instagram] OAuth error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Instagram login failed' });
  }
});

module.exports = router;
