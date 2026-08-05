/**
 * Backend sync service.
 *
 * When EXPO_PUBLIC_BACKEND_URL is set in your .env file (e.g. http://localhost:3001),
 * events are synced to the CelebConnect backend, which schedules the daily
 * reminder push notification for each event.
 *
 * Every request is authenticated with the signed-in user's JWT. The backend
 * scopes events to the token holder, so a request without a token is rejected
 * and syncing simply no-ops until the user signs in.
 *
 * If EXPO_PUBLIC_BACKEND_URL is not set, all calls silently do nothing — the app
 * still works fully offline with local notifications only.
 */

import * as SecureStore from 'expo-secure-store';
import { CalendarEvent } from '../types';

// Set this in your .env file: EXPO_PUBLIC_BACKEND_URL=http://YOUR_MAC_IP:3001
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
}

async function authedFetch(path: string, init: RequestInit): Promise<void> {
  if (!BACKEND_URL) return; // backend not configured — skip silently

  const token = await getAuthToken();
  if (!token) return; // signed out — nothing to sync to

  await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

/** Upserts an event on the backend (create or update). */
export async function syncEventToBackend(event: CalendarEvent): Promise<void> {
  await authedFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/** Removes an event from the backend. */
export async function deleteEventFromBackend(id: string): Promise<void> {
  await authedFetch(`/api/events/${id}`, { method: 'DELETE' });
}
