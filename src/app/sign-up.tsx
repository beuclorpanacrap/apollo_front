import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { AppMark } from '@/components/app-mark';
import { Colors, Fonts } from '@/constants/theme';

const theme = Colors.light;

export default function SignUpScreen() {
  const router = useRouter();
  const { registerPatient } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password || !firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth.trim())) {
      setErrorMessage('Date of birth must be in YYYY-MM-DD format (e.g., 1990-05-15).');
      return;
    }

    try {
      setIsSubmitting(true);
      // NOTE: registerPatient currently only handles patient sign-up.
      // If 'doctor' needs a different endpoint/flow, branch on `role` here.
      await registerPatient({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });
      router.replace('/onboarding');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
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

        <Text style={styles.title}>Create your</Text>
        <Text style={styles.titleAccent}>Health Vault</Text>
        <Text style={styles.subtitle}>
          Register to access encrypted health records and secure doctor consultations.
        </Text>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
            onPress={() => setRole('patient')}
          >
            <Image
              source={require('../../assets/images/patient_icon.png')}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <Text style={role === 'patient' ? styles.roleTextActive : styles.roleText}>
              Patient {role === 'patient' ? '✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'doctor' && styles.roleButtonActive]}
            onPress={() => setRole('doctor')}
          >
            <Image
              source={require('../../assets/images/doctor_icon.png')}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <Text style={role === 'doctor' ? styles.roleTextActive : styles.roleText}>
              Doctor {role === 'doctor' ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>First name *</Text>
            <TextInput
              style={styles.input}
              placeholder="John"
              value={firstName}
              onChangeText={setFirstName}
              editable={!isSubmitting}
            />
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Last name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Doe"
              value={lastName}
              onChangeText={setLastName}
              editable={!isSubmitting}
            />
          </View>
        </View>

        <Text style={styles.label}>Date of birth *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (e.g. 1990-05-15)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          keyboardType="numbers-and-punctuation"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Email address *</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Must be ≥8 characters with uppercase, lowercase, digit, and symbol.</Text>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSignUp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => router.push('/sign-in')}>
            Sign In
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
    marginBottom: 12,
  },
  title: { fontSize: 26, fontFamily: Fonts.sans.bold, fontWeight: '700', textAlign: 'center', color: theme.text },
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
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 16,
  },
  roleButtonActive: { borderColor: theme.tintStrong, backgroundColor: theme.pillGreenBg },
  roleIcon: { width: 40, height: 40 },
  roleText: { fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.text },
  roleTextActive: { fontSize: 14, fontFamily: Fonts.sans.semiBold, color: theme.tintStrong, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  halfCol: { flex: 1 },
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
    marginBottom: 4,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.text },
  helperText: { fontSize: 11, fontFamily: Fonts.sans.regular, color: theme.textTertiary, marginBottom: 16 },
  submitButton: {
    backgroundColor: theme.tint,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: theme.onTint, fontSize: 16, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.textSecondary },
  link: { color: theme.tintStrong, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
});