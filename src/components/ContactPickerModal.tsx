import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, SPACING } from '../utils/theme';

export interface PickedContact {
  name: string;
  phone: string;
}

interface Props {
  visible: boolean;
  onSelect: (contact: PickedContact) => void;
  onClose: () => void;
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
}

export default function ContactPickerModal({ visible, onSelect, onClose }: Props) {
  const [allContacts, setAllContacts]   = useState<ContactItem[]>([]);
  const [filtered, setFiltered]         = useState<ContactItem[]>([]);
  const [query, setQuery]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Load contacts when modal opens
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    loadContacts();
  }, [visible]);

  // Filter as user types
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(allContacts.slice(0, 50)); // show first 50 when no query
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      allContacts.filter(
        c => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      ).slice(0, 50)
    );
  }, [query, allContacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      // Dynamic require so the native module is only accessed when the modal opens,
      // not at app startup (allows Expo Go to launch without crashing).
      let Contacts: typeof import('expo-contacts');
      try {
        Contacts = require('expo-contacts');
      } catch {
        Alert.alert('Not supported', 'Contact picker requires a development build.');
        setLoading(false);
        return;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      // Flatten — one row per phone number per contact
      const items: ContactItem[] = [];
      for (const c of data) {
        const name = c.name ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
        if (!name) continue;
        if (c.phoneNumbers && c.phoneNumbers.length > 0) {
          for (const p of c.phoneNumbers) {
            const phone = p.number?.replace(/\s/g, '') ?? '';
            if (phone) {
              items.push({ id: `${c.id}-${phone}`, name, phone });
            }
          }
        }
      }

      setAllContacts(items);
      setFiltered(items.slice(0, 50));
    } catch (err) {
      Alert.alert('Error', 'Could not load contacts.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: ContactItem) => {
    onSelect({ name: item.name, phone: item.phone });
    onClose();
  };

  const renderItem = ({ item }: { item: ContactItem }) => (
    <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose Contact</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or phone..."
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : permissionDenied ? (
            <View style={styles.center}>
              <Text style={styles.permText}>📵</Text>
              <Text style={styles.permTitle}>Contacts Access Denied</Text>
              <Text style={styles.permSub}>
                Go to Settings → CelebConnect → allow Contacts to use this feature.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No contacts found for "{query}"</Text>
                </View>
              }
            />
          )}
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
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { color: COLORS.textSecondary, marginTop: SPACING.md },
  permText: { fontSize: 48, marginBottom: SPACING.md },
  permTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  permSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
