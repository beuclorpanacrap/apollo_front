import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';

type ThemePreference = 'System' | 'Light' | 'Dark';

interface PolicyModalContent {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Preferences State
  const [theme, setTheme] = useState<ThemePreference>('System');
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(false);

  // Modals State
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [policyModal, setPolicyModal] = useState<PolicyModalContent | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleExport = () => {
    if (Platform.OS === 'web') {
      window.alert('Export feature coming soon: Encrypted PDF and FHIR JSON export are currently under medical security review.');
    } else {
      Alert.alert(
        'Export Health Summary',
        'Export feature coming soon: Encrypted PDF and FHIR JSON export are currently under medical security review.'
      );
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/welcome');
  };

  const openPrivacyPolicy = () => {
    setPolicyModal({
      title: 'Privacy Policy',
      subtitle: 'Patient Data Sovereignty & Encryption Commitment',
      sections: [
        {
          heading: '1. Patient Sovereignty',
          body: 'Your medical health vault belongs exclusively to you. Apollo does not sell, monetize, or broker patient data to advertisers, insurance underwriters, or data aggregators.',
        },
        {
          heading: '2. Scoped Access Grants',
          body: 'Clinicians cannot access your records without an active consultation authorization. Single-use 6-digit access PINs expire automatically after 15 minutes, unlocking a strictly scoped 24-hour consultation session.',
        },
        {
          heading: '3. Immutable Record Integrity',
          body: 'Encounter notes, diagnostic observations, and issued prescriptions are cryptographically append-only to guarantee non-repudiation and medical record integrity.',
        },
      ],
    });
  };

  const openTermsOfService = () => {
    setPolicyModal({
      title: 'Terms of Service',
      subtitle: 'Apollo Vault Usage & Telemedicine Guidelines',
      sections: [
        {
          heading: '1. Sovereign Record Storage',
          body: 'By utilizing Apollo, you maintain ownership over all patient-declared baseline biometrics, allergy notifications, and lifestyle factors recorded in your personal vault.',
        },
        {
          heading: '2. Clinical Authenticity',
          body: 'Only verified medical practitioners holding accredited licenses verified by state or regional licensing boards may issue certified clinical diagnoses and prescriptions.',
        },
        {
          heading: '3. Emergency Disclaimer',
          body: 'Apollo Medical Vault is an encrypted personal health record platform. In the event of a medical emergency, immediately contact emergency services (e.g. 911 / 112) or proceed to the nearest emergency room.',
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Section 1: Account & Profile */}
          <Text style={styles.sectionHeader}>ACCOUNT & PROFILE</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: '#EAF7EF' }]}>
                <Ionicons name="person-outline" size={18} color="#2E7D51" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Full Name</Text>
                <Text style={styles.rowValue}>{user?.fullName || 'Patient'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="mail-outline" size={18} color="#4F46E5" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Email Address</Text>
                <Text style={styles.rowValue}>{user?.email || '—'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar-outline" size={18} color="#D97706" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Date of Birth</Text>
                <Text style={styles.rowValue}>{user?.dateOfBirth || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Section 2: Medical Baseline & Data */}
          <Text style={styles.sectionHeader}>MEDICAL BASELINE & DATA</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: '#EAF7EF' }]}>
                <Ionicons name="medkit-outline" size={18} color="#059669" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>Clinical Baseline & Biometrics</Text>
                <Text style={styles.actionSubtitle}>
                  Update gender, height, weight, allergies, and habits
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExport}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="download-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>Export Health Summary</Text>
                <Text style={styles.actionSubtitle}>
                  Download encrypted patient records (PDF/FHIR)
                </Text>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 3: Preferences */}
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="color-palette-outline" size={18} color="#475569" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>Theme</Text>
                <Text style={styles.actionSubtitle}>Appearance display mode</Text>
              </View>
              <View style={styles.segmentedContainer}>
                {(['System', 'Light', 'Dark'] as ThemePreference[]).map((mode) => {
                  const isSelected = theme === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                      onPress={() => setTheme(mode)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          isSelected && styles.segmentBtnTextActive,
                        ]}
                      >
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: '#CCFBF1' }]}>
                <Ionicons name="finger-print-outline" size={18} color="#0D9488" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>Biometric Lock</Text>
                <Text style={styles.actionSubtitle}>Require FaceID / TouchID on app launch</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                thumbColor={biometricsEnabled ? '#10B981' : '#F9FAFB'}
              />
            </View>
          </View>

          {/* Section 4: Legal & Policies */}
          <Text style={styles.sectionHeader}>LEGAL & POLICIES</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={openPrivacyPolicy}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>Privacy Policy</Text>
                <Text style={styles.actionSubtitle}>
                  Apollo patient data sovereignty commitment
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={openTermsOfService}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="document-text-outline" size={18} color="#4B5563" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>Terms of Service</Text>
                <Text style={styles.actionSubtitle}>
                  Cryptographic records & consultation terms
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Section 5: Session Action */}
          <Text style={styles.sectionHeader}>SESSION</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: '#DC2626' }]}>Log Out</Text>
                <Text style={styles.actionSubtitle}>Sign out of this device session</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Apollo Medical Vault • Version 0.1.0 (MVP)</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapper}>
              <Ionicons name="log-out-outline" size={26} color="#DC2626" />
            </View>
            <Text style={styles.dialogTitle}>Sign Out?</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to log out of your Apollo health vault on this device?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Policy / Terms Modal */}
      <Modal
        visible={!!policyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPolicyModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyDialogCard}>
            <View style={styles.policyHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>{policyModal?.title}</Text>
                <Text style={styles.policySubtitle}>{policyModal?.subtitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPolicyModal(null)}
                style={styles.policyCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.policyScroll}
              showsVerticalScrollIndicator={false}
            >
              {policyModal?.sections.map((sec, idx) => (
                <View key={idx} style={styles.policySection}>
                  <Text style={styles.policySectionHeading}>{sec.heading}</Text>
                  <Text style={styles.policySectionBody}>{sec.body}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.policyDoneBtn}
              onPress={() => setPolicyModal(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.policyDoneBtnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  container: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 22,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  actionTitle: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#4CAF7D',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 24,
  },

  // Logout Dialog
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  dialogIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  logoutButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Policy Modal
  policyDialogCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 14,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  policySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  policyCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  policyScroll: {
    marginBottom: 16,
  },
  policySection: {
    marginBottom: 14,
  },
  policySectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  policySectionBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  policyDoneBtn: {
    backgroundColor: '#4CAF7D',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  policyDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
