import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Locally-saved WhatsApp group names.
 *
 * WhatsApp doesn't expose a way for third-party apps to read a user's actual
 * WhatsApp Groups (no such API exists on-device or via the Business Cloud API),
 * so there's no way to "search WhatsApp" directly. Instead, once a group name
 * is typed into CelebConnect it's remembered here — future events can search
 * and reuse it instead of retyping it every time.
 */

export interface SavedGroup {
  id: string;
  name: string;
  createdAt: string;
}

const STORAGE_KEY = 'celebconnect_saved_groups';

export async function getSavedGroups(): Promise<SavedGroup[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves a group name if it isn't already saved (case-insensitive match).
 * Returns the full updated list.
 */
export async function saveGroup(name: string): Promise<SavedGroup[]> {
  const trimmed = name.trim();
  if (!trimmed) return getSavedGroups();

  const current = await getSavedGroups();
  const exists = current.some(g => g.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return current;

  const newGroup: SavedGroup = {
    // Date.now() alone can collide if two groups are saved in the same millisecond
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
  };
  const updated = [...current, newGroup];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function removeSavedGroup(id: string): Promise<SavedGroup[]> {
  const current = await getSavedGroups();
  const updated = current.filter(g => g.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
