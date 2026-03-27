'use strict';

/**
 * WhatsApp Business Cloud API sender.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Sends a plain-text WhatsApp message to a phone number.
 *
 * @param {string} toPhone  - Recipient phone in E.164 format e.g. "12025551234" (no +)
 * @param {string} message  - The text body to send
 * @returns {Promise<void>}
 */
async function sendWhatsAppMessage(toPhone, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error(
      'Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env'
    );
  }

  // Strip all non-digits from the phone number
  const cleanPhone = toPhone.replace(/\D/g, '');

  const response = await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

module.exports = { sendWhatsAppMessage };
