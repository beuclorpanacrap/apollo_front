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
import { AppMark } from '@/components/app-mark';
import { Colors, Fonts } from '@/constants/theme';

const theme = Colors.light;

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <AppMark size={64} />
        </View>

        <Text style={styles.title}>Your health records,</Text>
        <Text style={styles.titleAccent}>securely in one place.</Text>
        <Text style={styles.subtitle}>
          Apollo keeps your medical information organized, private, and accessible whenever you need it.
        </Text>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={theme.textTertiary}
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
            placeholderTextColor={theme.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={theme.textTertiary} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  logo: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.text,
  },
  titleAccent: {
    fontSize: 26,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    color: theme.tintStrong,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.sans.regular,
    textAlign: 'center',
    color: theme.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dangerBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: theme.danger, fontSize: 13, flex: 1, fontFamily: Fonts.sans.regular },
  label: { fontSize: 14, fontFamily: Fonts.sans.semiBold, fontWeight: '600', marginBottom: 8, color: theme.text },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.sans.regular,
    marginBottom: 16,
    color: theme.text,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.text },
  signInButton: {
    backgroundColor: theme.tint,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonDisabled: { opacity: 0.7 },
  signInText: { color: theme.onTint, fontSize: 16, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.textSecondary },
  link: { color: theme.tintStrong, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
});