import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleClinicianPortal = () => {
    if (Platform.OS === 'web') {
      window.alert(
        'Clinician Portal: Clinicians must use their verified medical license credentials to log into the doctor workstation.'
      );
    } else {
      Alert.alert(
        'Clinician Portal',
        'Clinicians must use their verified medical license credentials to log into the doctor workstation.'
      );
    }
    router.push('/sign-in');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Center Section: Branding & Identity */}
        <View style={styles.centerSection}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={54} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>Apollo Medical Vault</Text>
          <Text style={styles.subtitle}>Sovereign, patient-owned health records</Text>
        </View>

        {/* Bottom Anchored Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/sign-in')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/sign-up')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={19} color="#2E7D51" />
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clinicianLink}
            onPress={handleClinicianPortal}
            activeOpacity={0.6}
          >
            <Text style={styles.clinicianLinkText}>Doctor & Clinician Portal →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'space-between',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#4CAF7D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 16px rgba(76, 175, 125, 0.28)',
      },
      default: {
        shadowColor: '#4CAF7D',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  actionSection: {
    width: '100%',
    gap: 12,
    paddingBottom: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF7D',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(76, 175, 125, 0.2)',
      },
      default: {
        shadowColor: '#4CAF7D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EAF7EF',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#2E7D51',
    fontSize: 16,
    fontWeight: '700',
  },
  clinicianLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  clinicianLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
