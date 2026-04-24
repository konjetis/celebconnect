import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../utils/theme';

export default function AccountScreen() {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.firstName || !form.lastName) {
      return Alert.alert('Error', 'First and last name are required.');
    }
    if (user) {
      updateUser({
        ...user,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || user.email,
        phone: form.phone || user.phone,
        updatedAt: new Date().toISOString(),
      });
    }
    setEditing(false);
    Alert.alert('Success', 'Your profile has been updated!');
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && user) {
      try {
        // Copy the photo to the app's permanent document directory so it
        // persists across sessions (the temp URI from ImagePicker is wiped on reload).
        const photoDir = ((FileSystem as any).documentDirectory as string ?? '') + 'photos/';
        const dirInfo  = await FileSystem.getInfoAsync(photoDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
        }

        const filename    = `profile_${user.id}.jpg`;
        const destination = photoDir + filename;
        await FileSystem.copyAsync({ from: result.assets[0].uri, to: destination });

        updateUser({ ...user, profilePhoto: destination });
      } catch (err) {
        console.error('[AccountScreen] Failed to save profile photo:', err);
        // Fallback: use the temp URI (works for the current session)
        updateUser({ ...user, profilePhoto: result.assets[0].uri });
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarWrapper}>
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
              </Text>
            </View>
          )}
          <View style={styles.cameraBtn}><Text>📷</Text></View>
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.userContact}>{user?.email || user?.phone}</Text>
      </View>

      {/* Profile Form */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile Information</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            <Text style={styles.editBtn}>{editing ? '💾 Save' : '✏️ Edit'}</Text>
          </TouchableOpacity>
        </View>

        {[
          { label: 'First Name', field: 'firstName' as const, placeholder: 'First name' },
          { label: 'Last Name', field: 'lastName' as const, placeholder: 'Last name' },
          { label: 'Email Address', field: 'email' as const, placeholder: 'Email', keyboard: 'email-address' as const },
          { label: 'Phone Number', field: 'phone' as const, placeholder: 'Phone', keyboard: 'phone-pad' as const },
        ].map(({ label, field, placeholder, keyboard }) => (
          <View key={field} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
              value={form[field]}
              onChangeText={v => update(field, v)}
              placeholder={placeholder}
              editable={editing}
              keyboardType={keyboard}
              autoCapitalize={field.includes('Name') ? 'words' : 'none'}
            />
          </View>
        ))}

        {editing && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => {
            setEditing(false);
            setForm({
              firstName: user?.firstName ?? '',
              lastName: user?.lastName ?? '',
              email: user?.email ?? '',
              phone: user?.phone ?? '',
            });
          }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* App Settings Placeholder */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>📱 Push Notifications</Text>
          <Text style={styles.settingValue}>Enabled</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🔔 Reminder Days Before</Text>
          <Text style={styles.settingValue}>1 day</Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarWrapper: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 16, padding: 4,
    borderWidth: 2, borderColor: COLORS.border,
  },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  userContact: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  editBtn: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  fieldRow: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  fieldInput: {
    backgroundColor: COLORS.background, borderRadius: 10, padding: 12,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  fieldInputDisabled: { color: COLORS.textSecondary },
  cancelBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingLabel: { fontSize: 14, color: COLORS.text },
  settingValue: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  logoutBtn: {
    borderWidth: 1.5, borderColor: '#FF4444', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: SPACING.sm,
  },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '700' },
});
