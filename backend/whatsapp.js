'use strict';

/**
 * WhatsApp Business Cloud API sender.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 *
 * Sandbox mode (development): uses the hello_world template.
 * Production mode: sends free-form text (requires approved WhatsApp Business app).
 *
 * Set WHATSAPP_PRODUCTION=true in .env to switch to free-form text.
 */

const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v25.0';

/**
 * Sends a WhatsApp message to a phone number.
 * In sandbox mode (default): sends the hello_world template.
 * In production mode: sends free-form text.
 *
 * @param {string} toPhone  - Recipient phone in E.164 format e.g. "+12025551234"
 * @param {string} message  - The text body to send (used in production mode)
 * @returns {Promise<object>}
 */
async function sendWhatsAppMessage(toPhone, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN;
  const isProduction  = process.env.WHATSAPP_PRODUCTION === 'true';

  if (!phoneNumberId || !token) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env');
  }

  // Strip all non-digits from the phone number
  const cleanPhone = toPhone.replace(/\D/g, '');

  const body = isProduction
    ? {
        // Production: free-form text (only works after Meta app approval)
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                cleanPhone,
        type:              'text',
        text:              { body: message },
      }
    : {
        // Sandbox: template message (works with test numbers during development)
        messaging_product: 'whatsapp',
        to:                cleanPhone,
        type:              'template',
        template: {
          name:     'hello_world',
          language: { code: 'en_US' },
        },
      };

  const response = await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    body,
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`  [WhatsApp] Sent to ${cleanPhone} (${isProduction ? 'free-text' : 'template'})`);
  return response.data;
}

module.exports = { sendWhatsAppMessage };
