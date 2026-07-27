/**
 * Unit tests for savedGroupsService — the AsyncStorage-backed store of
 * remembered WhatsApp group names used by GroupPickerModal.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSavedGroups,
  saveGroup,
  removeSavedGroup,
} from '../../services/savedGroupsService';

const STORAGE_KEY = 'celebconnect_saved_groups';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getSavedGroups', () => {
  it('returns an empty array when nothing has been saved', async () => {
    const groups = await getSavedGroups();
    expect(groups).toEqual([]);
  });

  it('returns groups persisted in AsyncStorage', async () => {
    const stored = [{ id: '1', name: 'Family', createdAt: new Date().toISOString() }];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const groups = await getSavedGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Family');
  });

  it('returns an empty array if stored data is corrupt', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'NOT_VALID_JSON{{{');
    const groups = await getSavedGroups();
    expect(groups).toEqual([]);
  });
});

describe('saveGroup', () => {
  it('adds a new group and persists it', async () => {
    const updated = await saveGroup('Family');
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Family');

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted = JSON.parse(raw as string);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].name).toBe('Family');
  });

  it('trims whitespace before saving', async () => {
    const updated = await saveGroup('  College Friends  ');
    expect(updated[0].name).toBe('College Friends');
  });

  it('does not save an empty/whitespace-only name', async () => {
    const updated = await saveGroup('   ');
    expect(updated).toEqual([]);
  });

  it('does not create a duplicate for an existing name (case-insensitive)', async () => {
    await saveGroup('Family');
    const updated = await saveGroup('family');
    expect(updated).toHaveLength(1);
  });

  it('assigns each new group a unique id', async () => {
    const afterFirst = await saveGroup('Family');
    const afterSecond = await saveGroup('Work Friends');
    expect(afterSecond).toHaveLength(2);
    expect(afterSecond[0].id).not.toBe(afterSecond[1].id);
    expect(afterFirst[0].id).toBe(afterSecond[0].id);
  });
});

describe('removeSavedGroup', () => {
  it('removes the matching group and leaves others intact', async () => {
    await saveGroup('Family');
    const afterSecondSave = await saveGroup('Work Friends');
    const toRemove = afterSecondSave.find(g => g.name === 'Family')!;

    const updated = await removeSavedGroup(toRemove.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Work Friends');
  });

  it('is a no-op if the id does not exist', async () => {
    await saveGroup('Family');
    const updated = await removeSavedGroup('nonexistent-id');
    expect(updated).toHaveLength(1);
  });
});
