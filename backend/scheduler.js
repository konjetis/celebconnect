'use strict';

/**
 * Daily scheduler.
 * Runs at SEND_HOUR:SEND_MINUTE every day, finds all events for today,
 * and automatically sends WhatsApp messages to every contact.
 */

const cron = require('node-cron');
const { getEventsForDate } = require('./store');
const { sendWhatsAppMessage } = require('./whatsapp');

function getTodayString() {
  const d = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function replacePlaceholders(template, name) {
  return template.replace(/\{name\}/g, name);
}

async function sendTodaysMessages() {
  const today  = getTodayString();
  const events = await getEventsForDate(today);   // now async

  if (events.length === 0) {
    console.log(`[${new Date().toISOString()}] No events today (${today}).`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Processing ${events.length} event(s) for ${today}...`);

  for (const event of events) {
    if (!event.whatsappEnabled) continue;

    const template        = event.whatsappMessage || `Happy ${event.title}! 🎉`;
    const whatsappContacts = (event.contacts || []).filter(c => c.phone && !c.instagramHandle);

    for (const contact of whatsappContacts) {
      const message = replacePlaceholders(template, contact.name);
      try {
        await sendWhatsAppMessage(contact.phone, message);
        console.log(`  ✅ Sent to ${contact.name} (${contact.phone}): "${message.substring(0, 60)}..."`);
      } catch (err) {
        console.error(`  ❌ Failed to send to ${contact.name} (${contact.phone}):`, err.message);
      }

      // Small delay between sends to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function startScheduler() {
  const hour   = process.env.SEND_HOUR   ?? '9';
  const minute = process.env.SEND_MINUTE ?? '0';
  const cronExpression = `${minute} ${hour} * * *`;

  console.log(`[Scheduler] Will send messages daily at ${hour}:${minute.padStart(2, '0')} local time.`);
  console.log(`[Scheduler] Cron expression: "${cronExpression}"`);

  cron.schedule(cronExpression, () => {
    sendTodaysMessages().catch(err =>
      console.error('[Scheduler] Unexpected error:', err)
    );
  }, { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

  return sendTodaysMessages; // expose for manual testing
}

module.exports = { startScheduler, sendTodaysMessages };
