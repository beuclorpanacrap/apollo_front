import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login({ email: email.trim(), password });
      if (user.role !== 'ROLE_PATIENT') {
        // Still allow entry or show doctor note
        console.log(`[SignIn] Logged in as ${user.role}`);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logo}>
        <Ionicons name="shield-checkmark-outline" size={32} color="white" />
      </View>

      <Text style={styles.title}>Your health records,</Text>
      <Text style={styles.titleAccent}>securely in one place.</Text>
      <Text style={styles.subtitle}>
        Apollo keeps your medical information organized, private, and accessible whenever you need it.
      </Text>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isSubmitting}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="••••••••"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isSubmitting}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>I am a</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
          onPress={() => setRole('patient')}
        >
          <Text style={role === 'patient' ? styles.roleTextActive : styles.roleText}>
            🧑 Patient {role === 'patient' ? '✓' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === 'doctor' && styles.roleButtonActive]}
          onPress={() => setRole('doctor')}
        >
          <Text style={role === 'doctor' ? styles.roleTextActive : styles.roleText}>
            🧑‍⚕️ Doctor {role === 'doctor' ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.signInButton, isSubmitting && styles.signInButtonDisabled]}
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        Don't have an account?{' '}
        <Text style={styles.link} onPress={() => router.push('/sign-up')}>
          Sign Up
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    backgroundColor: '#fff',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#4CAF7D',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: '#1a1a1a' },
  titleAccent: {
    fontSize: 26,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#4CAF7D',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#777',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: '#D32F2F', fontSize: 13, flex: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  roleButtonActive: { borderColor: '#4CAF7D', backgroundColor: '#EAF7EF' },
  roleText: { fontSize: 14, color: '#333' },
  roleTextActive: { fontSize: 14, color: '#2E7D51', fontWeight: '600' },
  signInButton: {
    backgroundColor: '#4CAF7D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonDisabled: { opacity: 0.7 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 14, color: '#666' },
  link: { color: '#4CAF7D', fontWeight: '600' },
});