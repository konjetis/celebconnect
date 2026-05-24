'use strict';

/**
 * WhatsApp Business Cloud API sender.
 *
 * Sandbox mode (development): uses the hello_world template.
 * Production mode: uses the approved scheduled_notification template.
 *   Template body: "Hello {{1}}, you have a scheduled notification for {{2}} today."
 *   {{1}} = contact's first name, {{2}} = event title (e.g. "Birthday", "Anniversary")
 *
 * Set WHATSAPP_PRODUCTION=true in .env / Railway to switch to production template.
 */

const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v25.0';

async function sendWhatsAppMessage(toPhone, message, name = '', eventTitle = 'event') {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN;
  const isProduction  = process.env.WHATSAPP_PRODUCTION === 'true';

  if (!phoneNumberId || !token) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env');
  }

  const cleanPhone = toPhone.replace(/\D/g, '');
  const firstName  = (name || 'Friend').split(' ')[0];
  const cleanEventTitle = eventTitle
    ? eventTitle.charAt(0).toUpperCase() + eventTitle.slice(1).toLowerCase()
    : 'event';

  const body = isProduction
    ? {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                cleanPhone,
        type:              'template',
        template: {
          name:       'scheduled_notification',
          language:   { code: 'en' },
          components: [
            {
              type:       'body',
              parameters: [
                { type: 'text', text: firstName },
                { type: 'text', text: cleanEventTitle },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to:                cleanPhone,
        type:              'template',
        template: {
          name:     'hello_world',
          language: { code: 'en' },
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

  console.log(`  [WhatsApp] Sent to ${cleanPhone} (${isProduction ? `scheduled_notification: Hello ${firstName}, notification for ${cleanEventTitle}` : 'hello_world template'})`);
  return response.data;
}

module.exports = { sendWhatsAppMessage };
