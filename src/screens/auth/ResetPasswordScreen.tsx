import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../types';
import { COLORS, SPACING } from '../../utils/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://celebconnect-production.up.railway.app';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [done, setDone]               = useState(false);

  const handleReset = async () => {
    if (password.length < 8) {
      return Alert.alert('Too short', 'Password must be at least 8 characters.');
    }
    if (password !== confirm) {
      return Alert.alert('Mismatch', 'Passwords do not match.');
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setDone(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{done ? '✅' : '🔑'}</Text>
        <Text style={styles.title}>{done ? 'Password updated!' : 'Set new password'}</Text>
        <Text style={styles.subtitle}>
          {done
            ? 'Your password has been changed. You can now sign in with your new password.'
            : 'Choose a new password for your CelebConnect account.'}
        </Text>

        {!done && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your new password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.disabled]}
              onPress={handleReset}
              disabled={isLoading}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {done && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { flex: 1, padding: SPACING.lg, justifyContent: 'center' },
  icon:      { fontSize: 64, textAlign: 'center', marginBottom: SPACING.md },
  title: {
    fontSize: 26, fontWeight: '800', color: COLORS.text,
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    marginBottom: SPACING.xl, lineHeight: 22,
  },
  inputGroup:   { marginBottom: SPACING.lg },
  label:        { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  passwordRow:  { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, marginRight: 8 },
  eyeBtn:       { padding: 8 },
  eyeText:      { fontSize: 20 },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: SPACING.lg,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  disabled:       { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
