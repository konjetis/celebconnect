'use strict';

/**
 * Daily scheduler.
 * Runs at SEND_HOUR:SEND_MINUTE every day, finds all events for today
 * (including recurring events whose next occurrence falls on today),
 * and sends a push notification to the user's phone for each contact.
 *
 * When the user taps a notification, the app opens WhatsApp with the
 * message pre-filled — so the message comes from their personal number.
 */

const cron  = require('node-cron');
const axios = require('axios');
const { getEventsForDate, readAll } = require('./store');
const { getAllUsers } = require('./auth');

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayString() {
  const d = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if a recurring event's pattern fires on the given dateString.
 *
 * recurrence values: 'none' | 'yearly' | 'monthly' | 'weekly'
 * event.date is the original YYYY-MM-DD the event was first created for.
 */
function recurringEventMatchesToday(event, todayStr) {
  if (!event.recurrence || event.recurrence === 'none') return false;

  const original = new Date(event.date + 'T12:00:00'); // noon to avoid DST edge-cases
  const today    = new Date(todayStr    + 'T12:00:00');

  // Don't fire for a date before the original event
  if (today <= original) return false;

  switch (event.recurrence) {
    case 'yearly':
      // Same month and day, any future year
      return (
        today.getMonth() === original.getMonth() &&
        today.getDate()  === original.getDate()
      );

    case 'monthly':
      // Same day-of-month, any future month
      return today.getDate() === original.getDate();

    case 'weekly': {
      // Same day-of-week, every 7 days from the original
      const msPerDay  = 24 * 60 * 60 * 1000;
      const diffDays  = Math.round((today - original) / msPerDay);
      return diffDays % 7 === 0;
    }

    default:
      return false;
  }
}

/**
 * Returns all events that should fire today —
 * both exact-date matches AND recurring events whose pattern fires today.
 */
async function getEventsForToday(todayStr) {
  // Direct date matches (non-recurring events set for today)
  const exactMatches = await getEventsForDate(todayStr);
  const exactIds = new Set(exactMatches.map(e => e.id));

  // Check all events for recurring matches
  const allEvents      = await readAll();
  const recurringToday = allEvents.filter(
    e => !exactIds.has(e.id) && recurringEventMatchesToday(e, todayStr)
  );

  return [...exactMatches, ...recurringToday];
}

// ─── Message helpers ──────────────────────────────────────────────────────────

function replacePlaceholders(template, name) {
  return template.replace(/\{name\}/g, name);
}

/**
 * For yearly recurrence, append the ordinal year suffix (e.g. "Happy 3rd Birthday!")
 */
function enrichTemplate(template, event, todayStr) {
  if (event.recurrence !== 'yearly') return template;
  const original = new Date(event.date + 'T12:00:00');
  const today    = new Date(todayStr    + 'T12:00:00');
  const years    = today.getFullYear() - original.getFullYear();
  if (years <= 0) return template;
  const suffix   = years === 1 ? 'st' : years === 2 ? 'nd' : years === 3 ? 'rd' : 'th';
  // Only inject the year count if the template still contains the default pattern
  if (template.includes(`Happy ${event.title}`)) {
    return template.replace(
      `Happy ${event.title}`,
      `Happy ${years}${suffix} ${event.title}`
    );
  }
  return template;
}

// ─── Push notification sender ─────────────────────────────────────────────────

/**
 * Sends a push notification via Expo's Push API.
 * Each message carries the WhatsApp phone + text in its data payload
 * so the app can open the WhatsApp deep link when tapped.
 */
async function sendPushNotification({ expoPushToken, title, body, data }) {
  const message = {
    to:    expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };
  const response = await axios.post(
    'https://exp.host/--/api/v2/push/send',
    message,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
}

// ─── Main send function ───────────────────────────────────────────────────────

async function sendTodaysMessages() {
  const today  = getTodayString();
  const events = await getEventsForToday(today);

  if (events.length === 0) {
    console.log(`[${new Date().toISOString()}] No events today (${today}).`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Processing ${events.length} event(s) for ${today}...`);

  // Collect all Expo push tokens from registered users
  const allUsers   = await getAllUsers();
  const pushTokens = allUsers.map(u => u.expoPushToken).filter(Boolean);

  if (pushTokens.length === 0) {
    console.log('  ⚠️  No push tokens registered — no notifications sent.');
    return;
  }

  for (const event of events) {
    if (!event.whatsappEnabled) continue;

    const baseTemplate     = event.whatsappMessage || `Happy ${event.title}! 🎉`;
    const template         = enrichTemplate(baseTemplate, event, today);
    const whatsappContacts = (event.contacts || []).filter(c => c.phone && !c.instagramHandle);

    if (whatsappContacts.length === 0) {
      console.log(`  ⏭  "${event.title}" — WhatsApp enabled but no phone contacts. Skipping.`);
      continue;
    }

    for (const contact of whatsappContacts) {
      const message = replacePlaceholders(template, contact.name);

      // Send one push notification per token (usually just one — the owner's phone)
      for (const token of pushTokens) {
        try {
          await sendPushNotification({
            expoPushToken: token,
            title: `${event.title} 🎉`,
            body:  `Tap to send ${contact.name} a WhatsApp message`,
            data: {
              phone:    contact.name,    // display name for the notification
              waPhone:  contact.phone,   // actual phone number for the deep link
              message,
              eventId:  event.id,
              eventTitle: event.title,
            },
          });
          console.log(`  ✅ Push sent for "${event.title}" → ${contact.name} (${contact.phone})`);
        } catch (err) {
          console.error(`  ❌ Push failed for "${event.title}" → ${contact.name}:`, err.message);
        }
      }

      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

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

module.exports = { startScheduler, sendTodaysMessages, recurringEventMatchesToday };
