'use strict';

const express = require('express');
const router  = express.Router();

router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  console.log('[Instagram] Webhook verification request received');
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('[Instagram] Webhook verified successfully!');
    return res.status(200).send(challenge);
  }
  console.warn('[Instagram] Webhook verification failed — token mismatch');
  return res.status(403).json({ error: 'Verification failed' });
});

router.post('/webhook', (req, res) => {
  const body = req.body;
  res.status(200).send('EVENT_RECEIVED');
  if (body.object !== 'instagram') return;
  const entries = body.entry || [];
  for (const entry of entries) {
    const messaging = entry.messaging || [];
    for (const event of messaging) {
      const senderId = event.sender?.id;
      const message  = event.message;
      if (!message) continue;
      if (message.text) {
        console.log(`[Instagram] Message from ${senderId}: "${message.text}"`);
      }
    }
  }
});

module.exports = router;
