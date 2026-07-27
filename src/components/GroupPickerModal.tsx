import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Alert,
} from 'react-native';
import { COLORS, SPACING } from '../utils/theme';
import { SavedGroup, getSavedGroups, saveGroup, removeSavedGroup } from '../services/savedGroupsService';

interface Props {
  visible: boolean;
  onSelect: (name: string) => void;
  onClose: () => void;
}

/**
 * Search/select from previously-saved WhatsApp group names, or create a new
 * one on the fly (it's saved automatically so it shows up next time).
 *
 * There's no API to search a user's real WhatsApp Groups — this searches
 * CelebConnect's own memory of group names you've used before instead.
 */
export default function GroupPickerModal({ visible, onSelect, onClose }: Props) {
  const [allGroups, setAllGroups] = useState<SavedGroup[]>([]);
  const [filtered, setFiltered]   = useState<SavedGroup[]>([]);
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    loadGroups();
  }, [visible]);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(allGroups);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(allGroups.filter(g => g.name.toLowerCase().includes(q)));
  }, [query, allGroups]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const groups = await getSavedGroups();
    setAllGroups(groups.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, []);

  const handleSelect = (group: SavedGroup) => {
    onSelect(group.name);
    onClose();
  };

  const handleCreateNew = async () => {
    const name = query.trim();
    if (!name) return;
    const updated = await saveGroup(name);
    setAllGroups(updated.sort((a, b) => a.name.localeCompare(b.name)));
    onSelect(name);
    onClose();
  };

  const handleDelete = (group: SavedGroup) => {
    Alert.alert(
      'Remove Saved Group',
      `Remove "${group.name}" from your saved groups?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await removeSavedGroup(group.id);
            setAllGroups(updated);
          },
        },
      ]
    );
  };

  // Exact match already saved? Then don't offer to "create" a duplicate.
  const exactMatchExists = allGroups.some(
    g => g.name.toLowerCase() === query.trim().toLowerCase()
  );

  const renderItem = ({ item }: { item: SavedGroup }) => (
    <View style={styles.row}>
      <TouchableOpacity
        testID={`select-group-${item.id}`}
        style={styles.rowMain}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👥</Text>
        </View>
        <Text style={styles.name}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID={`delete-group-${item.id}`}
        onPress={() => handleDelete(item)}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Choose Group</Text>
            <TouchableOpacity testID="group-picker-close" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              testID="group-picker-search"
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search or type a new group name..."
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading ? (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>
                    {allGroups.length === 0
                      ? "No saved groups yet — type a name below to create one."
                      : `No saved groups match "${query}".`}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              query.trim() && !exactMatchExists ? (
                <TouchableOpacity testID="group-picker-create" style={styles.createRow} onPress={handleCreateNew}>
                  <Text style={styles.createRowText}>+ Create "{query.trim()}"</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '85%', paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  closeBtn: { padding: 6, backgroundColor: COLORS.surface, borderRadius: 20 },
  closeBtnText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: { fontSize: 16 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 12, color: COLORS.error, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  createRow: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
    backgroundColor: COLORS.primaryLight, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary,
  },
  createRowText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
