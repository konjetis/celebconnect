import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, LoginMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../utils/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://celebconnect-production.up.railway.app';

// Required for expo-web-browser to close the browser tab automatically on iOS
WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { login, isLoading } = useAuth();
  const [method, setMethod]       = useState<LoginMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [igLoading, setIgLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      return Alert.alert('Error', 'Please enter your credentials.');
    }
    try {
      await login({ identifier, password, method });
    } catch {
      Alert.alert('Login Failed', 'Invalid email/phone or password.');
    }
  };

  const handleInstagramLogin = async () => {
    setIgLoading(true);
    try {
      // Open the backend OAuth start endpoint in an in-app browser.
      // The backend redirects to Instagram → user approves → backend issues
      // a CelebConnect JWT → deep-links back to celebconnect://instagram-callback?token=...
      // App.tsx catches that deep link and calls loginWithInstagram(token).
      const result = await WebBrowser.openAuthSessionAsync(
        `${BACKEND_URL}/api/auth/instagram`,
        'celebconnect://instagram-callback'
      );

      if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed the browser — nothing to do
      }
      // On success the deep link is handled by App.tsx → navRegistry → AppNavigator
    } catch (err: any) {
      Alert.alert('Instagram Login Error', err.message ?? 'Something went wrong.');
    } finally {
      setIgLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🎉</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to CelebConnect</Text>
        </View>

        {/* Method toggle */}
        <View style={styles.toggleRow}>
          {(['email', 'phone'] as LoginMethod[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleBtn, method === m && styles.toggleBtnActive]}
              onPress={() => { setMethod(m); setIdentifier(''); }}
            >
              <Text style={[styles.toggleText, method === m && styles.toggleTextActive]}>
                {m === 'email' ? '✉️ Email' : '📱 Phone'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Identifier */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{method === 'email' ? 'Email Address' : 'Phone Number'}</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={method === 'email' ? 'you@example.com' : '+1 234 567 8900'}
            keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign In button */}
        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.disabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Sign In</Text>}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Instagram OAuth */}
        <TouchableOpacity
          style={[styles.igBtn, igLoading && styles.disabled]}
          onPress={handleInstagramLogin}
          disabled={igLoading}
        >
          {igLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.igBtnText}>📸  Continue with Instagram</Text>}
        </TouchableOpacity>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: SPACING.lg },
  header: { alignItems: 'center', marginVertical: SPACING.xl },
  logo: { fontSize: 64, marginBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 4, marginBottom: SPACING.lg,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, marginRight: 8 },
  eyeBtn: { padding: 8 },
  eyeText: { fontSize: 20 },
  forgotRow: { alignItems: 'flex-end', marginBottom: SPACING.lg },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, color: COLORS.textSecondary, fontSize: 13 },
  igBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#C13584',
    shadowColor: '#C13584', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  igBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  registerText: { color: COLORS.textSecondary, fontSize: 14 },
  registerLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
