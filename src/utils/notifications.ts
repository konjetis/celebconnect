import * as Notifications from 'expo-notifications';
import { CalendarEvent } from '../types';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Schedules a local notification for an event.
 * Fires at 9:00 AM on the event date (or notifyDaysBefore days earlier).
 * Returns the notification identifier, or null if the date is in the past.
 */
export async function scheduleEventNotification(
  event: CalendarEvent
): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  // Always cancel the old notification first so we don't double-schedule
  await cancelEventNotification(event.id);

  // Build the fire date: 9 AM local, offset by notifyDaysBefore
  const fireDate = new Date(event.date + 'T09:00:00');
  fireDate.setDate(fireDate.getDate() - event.notifyDaysBefore);

  if (fireDate <= new Date()) return null; // already in the past

  // Build a useful notification body
  const waContacts = event.contacts.filter(c => !c.instagramHandle);
  const igAccounts = event.contacts.filter(c => !!c.instagramHandle);

  const lines: string[] = [];
  if (event.notifyDaysBefore === 0) {
    lines.push('Today is the day! 🎉');
  } else {
    lines.push(`Coming up in ${event.notifyDaysBefore} day${event.notifyDaysBefore > 1 ? 's' : ''}!`);
  }
  if (waContacts.length > 0) {
    lines.push(`💬 WhatsApp → ${waContacts.map(c => c.name).join(', ')}`);
  }
  if (igAccounts.length > 0) {
    lines.push(`📸 Instagram → ${igAccounts.map(a => a.name).join(', ')}`);
  }
  if (event.whatsappMessage) {
    const preview = event.whatsappMessage.substring(0, 60);
    lines.push(`"${preview}${event.whatsappMessage.length > 60 ? '…' : ''}"`);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${getCategoryEmoji(event.category)} ${event.title}`,
      body: lines.join('\n'),
      // Pass the eventId so the app can navigate when the notification is tapped
      data: { eventId: event.id },
      sound: true,
    },
    trigger: {
      date: fireDate,
    } as any,
  });

  return id;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancels all scheduled notifications associated with the given event id.
 */
export async function cancelEventNotification(eventId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = scheduled.filter(n => n.content.data?.eventId === eventId);
  await Promise.all(
    matching.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    birthday: '🎂',
    anniversary: '💍',
    holiday: '🎉',
    custom: '⭐',
  };
  return map[category] ?? '📅';
}
