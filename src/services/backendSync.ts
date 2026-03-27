/**
 * Backend sync service.
 *
 * When EXPO_PUBLIC_BACKEND_URL is set in your .env file (e.g. http://localhost:3001),
 * events are synced to the CelebConnect backend which handles truly automatic
 * WhatsApp sending via the WhatsApp Business Cloud API.
 *
 * If the variable is not set, all calls silently do nothing — the app still
 * works fully offline with local notifications only.
 */

import { CalendarEvent } from '../types';

// Set this in your .env file: EXPO_PUBLIC_BACKEND_URL=http://YOUR_MAC_IP:3001
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

async function post(path: string, body: object): Promise<void> {
  if (!BACKEND_URL) return; // backend not configured — skip silently
  await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function del(path: string): Promise<void> {
  if (!BACKEND_URL) return;
  await fetch(`${BACKEND_URL}${path}`, { method: 'DELETE' });
}

/** Upserts an event on the backend (create or update). */
export async function syncEventToBackend(event: CalendarEvent): Promise<void> {
  await post('/api/events', event);
}

/** Removes an event from the backend. */
export async function deleteEventFromBackend(id: string): Promise<void> {
  await del(`/api/events/${id}`);
}
