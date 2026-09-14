import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logo}>
        <Ionicons name="radio-button-on-outline" size={32} color="white" />
      </View>

      <Text style={styles.title}>Your health records,</Text>
      <Text style={styles.titleAccent}>securely in one place.</Text>
      <Text style={styles.subtitle}>
        Apollo keeps your medical information organized, private, and accessible whenever you need it.
      </Text>

      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
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
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity>
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>

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

      <TouchableOpacity style={styles.signInButton}>
        <Text style={styles.signInText}>Sign In</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Don't have an account? <Text style={styles.link}>Sign Up</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40, backgroundColor: '#fff' },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#4CAF7D', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: '#1a1a1a' },
  titleAccent: { fontSize: 26, fontWeight: '700', fontStyle: 'italic', textAlign: 'center', color: '#4CAF7D', marginBottom: 12 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#777', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 20 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, marginBottom: 8 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  forgot: { color: '#4CAF7D', fontSize: 13, textAlign: 'right', marginBottom: 20 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleButton: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  roleButtonActive: { borderColor: '#4CAF7D', backgroundColor: '#EAF7EF' },
  roleText: { fontSize: 14, color: '#333' },
  roleTextActive: { fontSize: 14, color: '#2E7D51', fontWeight: '600' },
  signInButton: { backgroundColor: '#4CAF7D', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 13, color: '#555' },
  link: { color: '#4CAF7D', fontWeight: '600' },
});