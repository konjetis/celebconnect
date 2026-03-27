import { Linking, Alert } from 'react-native';
import { CalendarEvent, EventContact } from '../types';
import { generateWhatsAppMessage } from './helpers';

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

/**
 * Opens WhatsApp with a pre-filled message for the given contact.
 * The message template supports a {name} placeholder that gets replaced
 * with the contact's name.
 */
export async function openWhatsApp(
  contact: EventContact,
  messageTemplate: string
): Promise<void> {
  const message = generateWhatsAppMessage(messageTemplate, contact.name);
  const encoded = encodeURIComponent(message);

  // Strip everything except digits and a leading +
  const phone = (contact.phone ?? '').replace(/[^\d+]/g, '');

  const url = phone
    ? `whatsapp://send?phone=${phone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;        // group — no phone target

  const canOpen = await Linking.canOpenURL('whatsapp://send');
  if (!canOpen) {
    Alert.alert(
      'WhatsApp not found',
      'Make sure WhatsApp is installed on this device.',
      [{ text: 'OK' }]
    );
    return;
  }

  await Linking.openURL(url);
}

/**
 * Sends WhatsApp messages to all contacts on an event.
 * - One contact  → opens WhatsApp immediately
 * - Many contacts → shows a pick-list so the user taps each one
 */
export function sendWhatsAppMessages(event: CalendarEvent): void {
  const contacts = event.contacts.filter(c => !c.instagramHandle); // WhatsApp contacts only
  if (contacts.length === 0) return;

  const template = event.whatsappMessage ?? 'Happy {name}! 🎉';

  if (contacts.length === 1) {
    openWhatsApp(contacts[0], template);
    return;
  }

  // Multiple contacts — let the user choose
  Alert.alert(
    '💬 Send WhatsApp Messages',
    'Tap a contact to open WhatsApp:',
    [
      ...contacts.map(c => ({
        text: c.isWhatsAppGroup ? `👥 ${c.name}` : `👤 ${c.name}`,
        onPress: () => openWhatsApp(c, template),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
}

// ─── Instagram ────────────────────────────────────────────────────────────────

/**
 * Opens the Instagram app (or Instagram web) to the given user's profile.
 * There is no public API for sending DMs or posting from a third-party app,
 * so the best we can do is navigate the user to the profile.
 */
export async function openInstagramProfile(handle: string): Promise<void> {
  const username = handle.replace(/^@/, '');   // strip leading @
  const appUrl = `instagram://user?username=${username}`;
  const webUrl = `https://www.instagram.com/${username}/`;

  const canOpenApp = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpenApp ? appUrl : webUrl);
}

/**
 * Shows a list of Instagram accounts on the event so the user can
 * open each profile to post a story/message manually.
 */
export function openInstagramAccounts(event: CalendarEvent): void {
  const accounts = event.contacts.filter(c => !!c.instagramHandle);
  if (accounts.length === 0) return;

  if (accounts.length === 1) {
    openInstagramProfile(accounts[0].instagramHandle!);
    return;
  }

  Alert.alert(
    '📸 Open Instagram Profiles',
    'Tap a profile to open in Instagram:',
    [
      ...accounts.map(a => ({
        text: `${a.name} (${a.instagramHandle})`,
        onPress: () => openInstagramProfile(a.instagramHandle!),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]
  );
}
