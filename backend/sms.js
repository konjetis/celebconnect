'use strict';

/**
 * SMS sender for CelebConnect using Twilio.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID  — from console.twilio.com
 *   TWILIO_AUTH_TOKEN   — from console.twilio.com
 *   TWILIO_PHONE_NUMBER — your Twilio number, e.g. "+15005550006"
 */

function getTwilioClient() {
  try {
    const twilio = require('twilio');
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
    return twilio(sid, token);
  } catch (err) {
    throw new Error(`Twilio setup failed: ${err.message}`);
  }
}

/**
 * Sends a password reset SMS with a deep-link.
 * The link opens the CelebConnect app directly on the reset screen.
 */
async function sendResetSms(toPhone, resetToken) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[SMS] Twilio env vars not set — skipping SMS send (token logged below)');
    console.warn(`[SMS] Reset token for ${toPhone}: ${resetToken}`);
    return;
  }

  const resetLink = `celebconnect://reset-password?token=${resetToken}`;
  const client = getTwilioClient();

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to:   toPhone,
    body: `CelebConnect: Reset your password by tapping this link (expires in 1 hour):\n${resetLink}`,
  });

  console.log(`[SMS] Reset SMS sent to ${toPhone}`);
}

module.exports = { sendResetSms };
