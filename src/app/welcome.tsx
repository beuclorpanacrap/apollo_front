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

import { AppMark } from '@/components/app-mark';
import { Colors, Fonts } from '@/constants/theme';

const theme = Colors.light;

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
        <View style={styles.centeredGroup}>
          {/* Branding & Identity */}
          <View style={styles.centerSection}>
            <View style={styles.logoBadge}>
              <AppMark size={96} />
            </View>
            <Text style={styles.appTitle}>Apollo</Text>
            <Text style={styles.subtitle}>Keep your health records in one place.</Text>
          </View>

          {/* Action Section */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/sign-in')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in" size={20} color={theme.onTint} />
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/sign-up')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={19} color={theme.tintStrong} />
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clinicianLink}
              onPress={handleClinicianPortal}
              activeOpacity={0.6}
            >
              <Text style={styles.clinicianLinkText}>Doctor & clinician portal →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  centeredGroup: {
    width: '100%',
    alignItems: 'center',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  logoBadge: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 30,
    fontFamily: Fonts.display,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.sans.medium,
    color: theme.textSecondary,
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
    backgroundColor: theme.tint,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(79, 174, 114, 0.25)',
      },
      default: {
        shadowColor: theme.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: theme.onTint,
    fontSize: 16,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.pillGreenBg,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
  },
  secondaryButtonText: {
    color: theme.tintStrong,
    fontSize: 16,
    fontFamily: Fonts.sans.bold,
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
    fontFamily: Fonts.sans.medium,
    color: theme.textTertiary,
  },
});