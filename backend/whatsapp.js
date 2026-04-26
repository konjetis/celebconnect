'use strict';

/**
 * WhatsApp Business Cloud API sender.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 *
 * Sandbox mode (development): uses the hello_world template.
 * Production mode: uses the approved birthday_greeting template with the
 *   recipient's first name as {{1}}.
 *
 * Set WHATSAPP_PRODUCTION=true in .env to switch to production template.
 */

const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v25.0';

/**
 * Sends a WhatsApp message to a phone number.
 * In sandbox mode (default): sends the hello_world template.
 * In production mode: sends the birthday_greeting template with {{1}} = firstName.
 *
 * @param {string} toPhone   - Recipient phone in E.164 format e.g. "+12025551234"
 * @param {string} message   - The full message text (used to extract the first name)
 * @param {string} [name]    - Contact's display name (used as {{1}} in the template)
 * @returns {Promise<object>}
 */
async function sendWhatsAppMessage(toPhone, message, name = '') {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token         = process.env.WHATSAPP_ACCESS_TOKEN;
  const isProduction  = process.env.WHATSAPP_PRODUCTION === 'true';

  if (!phoneNumberId || !token) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env');
  }

  // Strip all non-digits from the phone number
  const cleanPhone = toPhone.replace(/\D/g, '');

  // Use just the first name for the template variable (e.g. "Surya Konjeti" → "Surya")
  const firstName = (name || 'Friend').split(' ')[0];

  const body = isProduction
    ? {
        // Production: approved birthday_greeting template
        // Template body: "Happy Birthday {{1}}! 🎂 Wishing you a wonderful day filled with joy and celebration!"
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                cleanPhone,
        type:              'template',
        template: {
          name:       'birthday_greeting',
          language:   { code: 'en_US' },
          components: [
            {
              type:       'body',
              parameters: [
                { type: 'text', text: firstName },
              ],
            },
          ],
        },
      }
    : {
        // Sandbox: hello_world template (works with test numbers during development)
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

  console.log(`  [WhatsApp] Sent to ${cleanPhone} (${isProduction ? 'birthday_greeting template' : 'hello_world template'})`);
  return response.data;
}

module.exports = { sendWhatsAppMessage };
