import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, LoginMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../utils/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const { register, isLoading } = useAuth();
  const [method, setMethod] = useState<LoginMethod>('email');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const update = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password, confirmPassword } = form;
    if (!firstName || !lastName || !password) {
      return Alert.alert('Error', 'Please fill in all required fields.');
    }
    if (method === 'email' && !email) return Alert.alert('Error', 'Email is required.');
    if (method === 'phone' && !phone) return Alert.alert('Error', 'Phone number is required.');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match.');
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters.');

    try {
      await register({ firstName, lastName, email, phone, password, confirmPassword, method });
    } catch {
      Alert.alert('Registration Failed', 'Please try again.');
    }
  };

  const Field = ({ label, field, ...props }: { label: string; field: keyof typeof form } & Record<string, unknown>) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[field] as string}
        onChangeText={(v: string) => update(field, v)}
        {...props}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join CelebConnect and never miss a special day</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          {(['email', 'phone'] as LoginMethod[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleBtn, method === m && styles.toggleBtnActive]}
              onPress={() => setMethod(m)}
            >
              <Text style={[styles.toggleText, method === m && styles.toggleTextActive]}>
                {m === 'email' ? '✉️ Email' : '📱 Phone'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} value={form.firstName}
              onChangeText={v => update('firstName', v)} placeholder="First" autoCapitalize="words" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={form.lastName}
              onChangeText={v => update('lastName', v)} placeholder="Last" autoCapitalize="words" />
          </View>
        </View>

        {method === 'email' ? (
          <Field label="Email Address" field="email"
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        ) : (
          <Field label="Phone Number" field="phone"
            placeholder="+1 234 567 8900" keyboardType="phone-pad" />
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.password} onChangeText={v => update('password', v)}
              placeholder="Min. 8 characters" secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Text>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={form.confirmPassword} onChangeText={v => update('confirmPassword', v)}
            placeholder="Repeat password" secureTextEntry={!showPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.disabled]}
          onPress={handleRegister} disabled={isLoading}
        >
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
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
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: SPACING.lg },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 14 },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginVertical: SPACING.lg,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  disabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xl },
  loginText: { color: COLORS.textSecondary, fontSize: 14 },
  loginLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
