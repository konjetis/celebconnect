import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Switch, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CalendarStackParamList, CalendarEvent, EventCategory, RecurrenceType, EventContact } from '../../types';
import { useEvents } from '../../context/EventContext';
import { COLORS, SPACING } from '../../utils/theme';

type AddProps = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, 'AddEvent'>;
  route: RouteProp<CalendarStackParamList, 'AddEvent'>;
};
type EditProps = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, 'EditEvent'>;
  route: RouteProp<CalendarStackParamList, 'EditEvent'>;
};

type Props = AddProps | EditProps;

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'birthday', label: '🎂 Birthday' },
  { value: 'anniversary', label: '💍 Anniversary' },
  { value: 'holiday', label: '🎉 Holiday' },
  { value: 'custom', label: '⭐ Custom' },
];

const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'One-time' },
  { value: 'yearly', label: 'Every Year' },
  { value: 'monthly', label: 'Every Month' },
  { value: 'weekly', label: 'Every Week' },
];

export default function AddEditEventScreen({ navigation, route }: Props) {
  const { addEvent, updateEvent, events } = useEvents();
  const isEdit = 'eventId' in route.params;
  const existingEvent = isEdit ? events.find(e => e.id === (route.params as { eventId: string }).eventId) : undefined;

  const [form, setForm] = useState({
    title: existingEvent?.title ?? '',
    date: existingEvent?.date ?? (('date' in route.params ? route.params.date : undefined) ?? new Date().toISOString().split('T')[0]),
    category: existingEvent?.category ?? 'birthday' as EventCategory,
    recurrence: existingEvent?.recurrence ?? 'yearly' as RecurrenceType,
    description: existingEvent?.description ?? '',
    whatsappEnabled: existingEvent?.whatsappEnabled ?? false,
    instagramEnabled: existingEvent?.instagramEnabled ?? false,
    whatsappMessage: existingEvent?.whatsappMessage ?? '',
    instagramCaption: existingEvent?.instagramCaption ?? '',
    notifyDaysBefore: existingEvent?.notifyDaysBefore ?? 1,
  });

  // WhatsApp contacts
  const [contacts, setContacts] = useState<EventContact[]>(
    existingEvent?.contacts.filter(c => c.phone || c.isWhatsAppGroup) ?? []
  );
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactIsGroup, setNewContactIsGroup] = useState(false);

  const addContact = () => {
    if (!newContactName.trim()) return Alert.alert('Error', 'Please enter a name.');
    if (!newContactIsGroup && !newContactPhone.trim()) return Alert.alert('Error', 'Please enter a phone number.');
    const contact: EventContact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      phone: newContactIsGroup ? undefined : newContactPhone.trim(),
      isWhatsAppGroup: newContactIsGroup,
    };
    setContacts(prev => [...prev, contact]);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactIsGroup(false);
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Instagram accounts
  const [igAccounts, setIgAccounts] = useState<EventContact[]>(
    existingEvent?.contacts.filter(c => c.instagramHandle) ?? []
  );
  const [newIgName, setNewIgName] = useState('');
  const [newIgHandle, setNewIgHandle] = useState('');

  const addIgAccount = () => {
    if (!newIgName.trim()) return Alert.alert('Error', 'Please enter a name.');
    if (!newIgHandle.trim()) return Alert.alert('Error', 'Please enter an Instagram handle.');
    const handle = newIgHandle.trim().replace(/^@/, ''); // strip leading @
    const account: EventContact = {
      id: Date.now().toString(),
      name: newIgName.trim(),
      instagramHandle: handle,
    };
    setIgAccounts(prev => [...prev, account]);
    setNewIgName('');
    setNewIgHandle('');
  };

  const removeIgAccount = (id: string) => {
    setIgAccounts(prev => prev.filter(a => a.id !== id));
  };

  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) return Alert.alert('Error', 'Event title is required.');
    try {
      const allContacts = [...contacts, ...igAccounts];
      if (isEdit && existingEvent) {
        await updateEvent({ ...existingEvent, ...form, contacts: allContacts });
      } else {
        await addEvent({ ...form, contacts: allContacts });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>{isEdit ? '✏️ Edit Event' : '🎉 Add Event'}</Text>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={v => update('title', v)}
          placeholder="e.g. Mom's Birthday"
        />
      </View>

      {/* Date */}
      <View style={styles.field}>
        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={styles.input}
          value={form.date}
          onChangeText={v => update('date', v)}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, form.category === c.value && styles.chipActive]}
              onPress={() => update('category', c.value)}
            >
              <Text style={[styles.chipText, form.category === c.value && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recurrence */}
      <View style={styles.field}>
        <Text style={styles.label}>Recurrence</Text>
        <View style={styles.chipRow}>
          {RECURRENCES.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.chip, form.recurrence === r.value && styles.chipActive]}
              onPress={() => update('recurrence', r.value)}
            >
              <Text style={[styles.chipText, form.recurrence === r.value && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={v => update('description', v)}
          placeholder="Add notes..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* WhatsApp Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleHeader}>
          <Text style={styles.toggleTitle}>💬 Auto WhatsApp Message</Text>
          <Switch
            value={form.whatsappEnabled}
            onValueChange={v => update('whatsappEnabled', v)}
            trackColor={{ true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
        {form.whatsappEnabled && (
          <>
            <TextInput
              style={[styles.input, styles.textArea, { marginTop: SPACING.sm }]}
              value={form.whatsappMessage}
              onChangeText={v => update('whatsappMessage', v)}
              placeholder="Type your WhatsApp message... (use {name} for recipient name)"
              multiline
              numberOfLines={3}
            />

            {/* Contacts */}
            <Text style={styles.contactsLabel}>📋 Send To</Text>

            {contacts.map(contact => (
              <View key={contact.id} style={styles.contactRow}>
                <Text style={styles.contactIcon}>{contact.isWhatsAppGroup ? '👥' : '👤'}</Text>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.phone ? <Text style={styles.contactPhone}>{contact.phone}</Text> : null}
                  {contact.isWhatsAppGroup ? <Text style={styles.contactPhone}>WhatsApp Group</Text> : null}
                </View>
                <TouchableOpacity onPress={() => removeContact(contact.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add New Contact */}
            <View style={styles.addContactSection}>
              <View style={styles.toggleTypeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, !newContactIsGroup && styles.typeBtnActive]}
                  onPress={() => setNewContactIsGroup(false)}
                >
                  <Text style={[styles.typeBtnText, !newContactIsGroup && styles.typeBtnTextActive]}>👤 Individual</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, newContactIsGroup && styles.typeBtnActive]}
                  onPress={() => setNewContactIsGroup(true)}
                >
                  <Text style={[styles.typeBtnText, newContactIsGroup && styles.typeBtnTextActive]}>👥 Group</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { marginTop: SPACING.sm }]}
                value={newContactName}
                onChangeText={setNewContactName}
                placeholder={newContactIsGroup ? 'Group name' : 'Contact name'}
              />
              {!newContactIsGroup && (
                <TextInput
                  style={[styles.input, { marginTop: SPACING.sm }]}
                  value={newContactPhone}
                  onChangeText={setNewContactPhone}
                  placeholder="+1 234 567 8900"
                  keyboardType="phone-pad"
                />
              )}
              <TouchableOpacity style={styles.addContactBtn} onPress={addContact}>
                <Text style={styles.addContactBtnText}>+ Add Recipient</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Instagram Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleHeader}>
          <Text style={styles.toggleTitle}>📸 Auto Instagram Post</Text>
          <Switch
            value={form.instagramEnabled}
            onValueChange={v => update('instagramEnabled', v)}
            trackColor={{ true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
        {form.instagramEnabled && (
          <>
            <TextInput
              style={[styles.input, styles.textArea, { marginTop: SPACING.sm }]}
              value={form.instagramCaption}
              onChangeText={v => update('instagramCaption', v)}
              placeholder="Type your Instagram caption... #celebration"
              multiline
              numberOfLines={3}
            />

            {/* Instagram Accounts */}
            <Text style={styles.contactsLabel}>📋 Tag Accounts</Text>

            {igAccounts.map(account => (
              <View key={account.id} style={styles.contactRow}>
                <Text style={styles.contactIcon}>📸</Text>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{account.name}</Text>
                  <Text style={styles.contactPhone}>@{account.instagramHandle}</Text>
                </View>
                <TouchableOpacity onPress={() => removeIgAccount(account.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addContactSection}>
              <TextInput
                style={styles.input}
                value={newIgName}
                onChangeText={setNewIgName}
                placeholder="Person's name"
              />
              <TextInput
                style={[styles.input, { marginTop: SPACING.sm }]}
                value={newIgHandle}
                onChangeText={setNewIgHandle}
                placeholder="@instagram_handle"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.addContactBtn} onPress={addIgAccount}>
                <Text style={styles.addContactBtnText}>+ Add Instagram Account</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>
          {isEdit ? '💾 Save Changes' : '🎉 Add Event'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  field: { marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  toggleCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: SPACING.sm,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  contactsLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  contactIcon: { fontSize: 20, marginRight: SPACING.sm },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  contactPhone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  removeBtn: { padding: 6, backgroundColor: '#FFF0F0', borderRadius: 8 },
  removeBtnText: { fontSize: 12, color: COLORS.error, fontWeight: '700' },
  addContactSection: { marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  toggleTypeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  addContactBtn: {
    marginTop: SPACING.sm, backgroundColor: COLORS.primaryLight, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary,
  },
  addContactBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
