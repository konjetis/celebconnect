import { Linking, Alert, Clipboard } from 'react-native';
import { CalendarEvent, EventContact } from '../types';
import { generateWhatsAppMessage } from './helpers';

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

/**
 * Opens WhatsApp with a pre-filled message for the given contact.
 * If WhatsApp is not installed, offers to copy the message to clipboard instead.
 */
export async function openWhatsApp(
  contact: EventContact,
  messageTemplate: string
): Promise<void> {
  const message = generateWhatsAppMessage(messageTemplate, contact.name);
  const encoded = encodeURIComponent(message);
  // WhatsApp requires digits only — no +, spaces, or dashes
  const phone = (contact.phone ?? '').replace(/[^\d]/g, '');
  const url = phone
    ? `whatsapp://send?phone=${phone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  // Try to open WhatsApp directly — canOpenURL is unreliable in Expo Go
  // because LSApplicationQueriesSchemes isn't declared in Expo Go's Info.plist
  try {
    await Linking.openURL(url);
  } catch {
    // WhatsApp not installed or couldn't open — offer clipboard fallback
    Alert.alert(
      'Could Not Open WhatsApp',
      `Would you like to copy the message to your clipboard instead?\n\n"${message}"`,
      [
        {
          text: 'Copy Message',
          onPress: () => {
            Clipboard.setString(message);
            Alert.alert('✅ Copied!', 'Message copied! You can paste it into WhatsApp or any chat app.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }
}

/**
 * Sends WhatsApp messages to all contacts on an event.
 * - One contact  → opens WhatsApp immediately
 * - Many contacts → shows a pick-list so the user taps each one
 */
export function sendWhatsAppMessages(event: CalendarEvent): void {
  const contacts = event.contacts.filter(c => !c.instagramHandle);

  // No recipients added — tell the user clearly
  if (contacts.length === 0) {
    Alert.alert(
      '💬 No Recipients Added',
      'Please edit this event, enable WhatsApp, and add at least one recipient with their phone number.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Use WhatsApp message, then Notes, then a friendly default
  const template = event.whatsappMessage?.trim() || event.description?.trim() || `Happy ${event.title}! 🎉`;

  if (contacts.length === 1) {
    openWhatsApp(contacts[0], template);
    return;
  }

  // Multiple contacts — show picker
  Alert.alert(
    '💬 Send WhatsApp Message',
    `Message: "${template.substring(0, 60)}${template.length > 60 ? '...' : ''}"\n\nTap a recipient:`,
    [
      ...contacts.map(c => ({
        text: c.isWhatsAppGroup ? `👥 ${c.name}` : `👤 ${c.name} ${c.phone ? `(${c.phone})` : ''}`,
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
