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

export default function SignUpScreen() {
  const router = useRouter();
  const { registerPatient } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password || !firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    // Basic date format validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth.trim())) {
      setErrorMessage('Date of birth must be in YYYY-MM-DD format (e.g., 1995-04-12).');
      return;
    }

    try {
      setIsSubmitting(true);
      await registerPatient({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        bloodType,
      });
      router.replace('/onboarding' as any);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logo}>
        <Ionicons name="medical-outline" size={32} color="white" />
      </View>

      <Text style={styles.title}>Create your</Text>
      <Text style={styles.titleAccent}>Patient Health Vault</Text>
      <Text style={styles.subtitle}>
        Register to access encrypted health records and secure doctor consultations.
      </Text>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={18} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

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
          <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#888" />
        </TouchableOpacity>
      </View>
      <Text style={styles.helperText}>Must be ≥8 characters with uppercase, lowercase, digit, and symbol.</Text>

      <Text style={styles.label}>Date of birth (YYYY-MM-DD) *</Text>
      <TextInput
        style={styles.input}
        placeholder="1990-01-15"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        editable={!isSubmitting}
      />

      <Text style={styles.label}>Blood Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bloodTypeRow}>
        {bloodTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.bloodTypePill, bloodType === type && styles.bloodTypePillActive]}
            onPress={() => setBloodType(type)}
          >
            <Text style={bloodType === type ? styles.bloodTypeTextActive : styles.bloodTypeText}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  row: { flexDirection: 'row', gap: 12 },
  halfCol: { flex: 1 },
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
    marginBottom: 4,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  helperText: { fontSize: 11, color: '#888', marginBottom: 16 },
  bloodTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  bloodTypePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  bloodTypePillActive: { backgroundColor: '#EAF7EF', borderColor: '#4CAF7D' },
  bloodTypeText: { fontSize: 13, color: '#555', fontWeight: '500' },
  bloodTypeTextActive: { fontSize: 13, color: '#2E7D51', fontWeight: '700' },
  submitButton: {
    backgroundColor: '#4CAF7D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 14, color: '#666' },
  link: { color: '#4CAF7D', fontWeight: '600' },
});
