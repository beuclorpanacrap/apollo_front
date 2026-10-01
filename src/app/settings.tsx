import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { ThemeMode } from '@/context/theme-context';
import { ThemedDatePicker } from '@/components/themed-date-picker';
import { vaultApi } from '@/api/vault.api';
import { AppTheme, Fonts } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme';

interface PolicyModalContent {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

export default function SettingsScreen() {
  const { theme, isDark, themeMode, setThemeMode } = useThemeContext();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const router = useRouter();
  const { user, logout, refreshUser, updateUserLocally } = useAuth();

  const parseIsoDate = (iso?: string | null): Date | null => {
    if (!iso) return null;
    const parts = iso.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  // Preferences State
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(false);

  // Modals State
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [policyModal, setPolicyModal] = useState<PolicyModalContent | null>(null);

  // Profile Edit Modals State
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [firstNameInput, setFirstNameInput] = useState<string>('');
  const [lastNameInput, setLastNameInput] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

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

  // --- Name Editing ---
  const openNameModal = () => {
    const parts = (user?.fullName || '').trim().split(/\s+/);
    setFirstNameInput(parts[0] || '');
    setLastNameInput(parts.slice(1).join(' ') || '');
    setNameError(null);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    const trimmedFirst = firstNameInput.trim();
    const trimmedLast = lastNameInput.trim();
    if (!trimmedFirst) {
      setNameError('First name is required');
      return;
    }
    setIsSavingName(true);
    setNameError(null);
    try {
      const updatedFullName = `${trimmedFirst} ${trimmedLast}`.trim();
      updateUserLocally({ fullName: updatedFullName });
      await vaultApi.updateProfile({
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });
      await refreshUser();
      setShowNameModal(false);
    } catch (err: any) {
      setNameError(err.message || 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  // --- Email Editing ---
  const openEmailModal = () => {
    setEmailInput(user?.email || '');
    setEmailError(null);
    setShowEmailModal(true);
  };

  const handleSaveEmail = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setIsSavingEmail(true);
    setEmailError(null);
    try {
      updateUserLocally({ email: trimmedEmail });
      await vaultApi.updateProfile({ email: trimmedEmail });
      await refreshUser();
      setShowEmailModal(false);
    } catch (err: any) {
      if (
        err.status === 409 ||
        err.message?.includes('Conflict') ||
        err.message?.includes('already registered')
      ) {
        setEmailError('This email is already registered to another account');
      } else {
        setEmailError(err.message || 'Failed to update email address');
      }
    } finally {
      setIsSavingEmail(false);
    }
  };

  // --- Date of Birth Editing ---
  const handleDateSelect = async (selectedDate: Date) => {
    setShowDatePicker(false);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dobString = `${yyyy}-${mm}-${dd}`;

    try {
      updateUserLocally({ dateOfBirth: dobString });
      await vaultApi.updateProfile({ dateOfBirth: dobString });
      await refreshUser();
    } catch (err) {
      console.warn('[Settings] Failed to update date of birth:', err);
    }
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={isDark ? theme.text : '#FFFDF7'} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>Account & Preferences</Text>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>

        {/* Section 1: Account & Profile */}
        <Text style={styles.sectionTitle}>Account & Profile</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={openNameModal} activeOpacity={0.7}>
            <View style={styles.iconWrapper}>
              <Ionicons name="person-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Full Name</Text>
              <Text style={styles.rowValue}>{user?.fullName || 'Patient'}</Text>
            </View>
            <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={openEmailModal} activeOpacity={0.7}>
            <View style={styles.iconWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Email Address</Text>
              <Text style={styles.rowValue}>{user?.email || '—'}</Text>
            </View>
            <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name="calendar-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Date of Birth</Text>
              <Text style={styles.rowValue}>{user?.dateOfBirth || 'Select date'}</Text>
            </View>
            <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Section 2: Medical Baseline & Data */}
        <Text style={styles.sectionTitle}>Medical Baseline & Data</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name="medkit-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.actionTitle}>Clinical Baseline & Biometrics</Text>
              <Text style={styles.actionSubtitle}>
                Update gender, height, weight, allergies, and habits
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={handleExport} activeOpacity={0.7}>
            <View style={styles.iconWrapper}>
              <Ionicons name="download-outline" size={20} color={theme.tintStrong} />
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
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <Ionicons name="color-palette-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.actionTitle}>Theme</Text>
              <Text style={styles.actionSubtitle}>Appearance display mode</Text>
            </View>
            <View style={styles.segmentedContainer}>
              {(['System', 'Light', 'Dark'] as ThemeMode[]).map((mode) => {
                const isSelected = themeMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                    onPress={() => setThemeMode(mode)}
                    activeOpacity={0.8}
                  >
                    <Text style={isSelected ? styles.segmentBtnTextActive : styles.segmentBtnText}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <Ionicons name="finger-print-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.actionTitle}>Biometric Lock</Text>
              <Text style={styles.actionSubtitle}>Require FaceID / TouchID on app launch</Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: theme.border, true: theme.pillGreenBg }}
              thumbColor={biometricsEnabled ? theme.tint : theme.surfaceMuted}
            />
          </View>
        </View>

        {/* Section 4: Legal & Policies */}
        <Text style={styles.sectionTitle}>Legal & Policies</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={openPrivacyPolicy} activeOpacity={0.7}>
            <View style={styles.iconWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.actionTitle}>Privacy Policy</Text>
              <Text style={styles.actionSubtitle}>
                Apollo patient data sovereignty commitment
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} onPress={openTermsOfService} activeOpacity={0.7}>
            <View style={styles.iconWrapper}>
              <Ionicons name="document-text-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.actionTitle}>Terms of Service</Text>
              <Text style={styles.actionSubtitle}>
                Cryptographic records & consultation terms
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Section 5: Session Action */}
        <Text style={styles.sectionTitle}>Session</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapperDanger}>
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.actionTitleDanger}>Log Out</Text>
              <Text style={styles.actionSubtitle}>Sign out of this device session</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Full Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingName && setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapper}>
              <Ionicons name="person-outline" size={24} color={theme.tintStrong} />
            </View>
            <Text style={styles.dialogTitle}>Edit Full Name</Text>
            <Text style={styles.dialogMessage}>
              Update your preferred name on your medical vault records.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="First name"
                placeholderTextColor={theme.textTertiary}
                value={firstNameInput}
                onChangeText={setFirstNameInput}
                editable={!isSavingName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Last name"
                placeholderTextColor={theme.textTertiary}
                value={lastNameInput}
                onChangeText={setLastNameInput}
                editable={!isSavingName}
              />
            </View>

            {nameError && <Text style={styles.errorText}>{nameError}</Text>}

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowNameModal(false)}
                disabled={isSavingName}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveName}
                disabled={isSavingName}
                activeOpacity={0.8}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color={theme.onTint} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Email Modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingEmail && setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapper}>
              <Ionicons name="mail-outline" size={24} color={theme.tintStrong} />
            </View>
            <Text style={styles.dialogTitle}>Edit Email Address</Text>
            <Text style={styles.dialogMessage}>
              Update the email address associated with your account.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="you@example.com"
                placeholderTextColor={theme.textTertiary}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSavingEmail}
                autoFocus
              />
            </View>

            {emailError && <Text style={styles.errorText}>{emailError}</Text>}

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEmailModal(false)}
                disabled={isSavingEmail}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEmail}
                disabled={isSavingEmail}
                activeOpacity={0.8}
              >
                {isSavingEmail ? (
                  <ActivityIndicator size="small" color={theme.onTint} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date of Birth Picker */}
      <ThemedDatePicker
        visible={showDatePicker}
        value={parseIsoDate(user?.dateOfBirth)}
        maximumDate={new Date()}
        onClose={() => setShowDatePicker(false)}
        onChange={handleDateSelect}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapperDanger}>
              <Ionicons name="log-out-outline" size={26} color={theme.danger} />
            </View>
            <Text style={styles.dialogTitle}>Sign Out?</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to log out of your Apollo health vault on this device?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutBtnText}>Log Out</Text>
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
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.policyScroll} showsVerticalScrollIndicator={false}>
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

const createStyles = (theme: AppTheme, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.backgroundElement : theme.tintStrong,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 18,
      marginBottom: 20,
      gap: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    backButton: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.16)',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 13,
      fontFamily: Fonts.sans.medium,
      color: isDark ? '#9CA3AF' : 'rgba(255, 253, 247, 0.8)',
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: Fonts.display,
      fontWeight: '800',
      color: isDark ? '#F9FAFB' : '#FFFDF7',
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      marginTop: 8,
    },
    card: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 20,
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 2px 10px rgba(50, 122, 76, 0.08)',
        },
        default: {
          shadowColor: theme.tintStrong,
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 10,
          elevation: 2,
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
    iconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.pillGreenBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapperDanger: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.dangerBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 12,
      fontFamily: Fonts.sans.medium,
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: 2,
    },
    rowValue: {
      fontSize: 14,
      fontFamily: Fonts.sans.semiBold,
      fontWeight: '600',
      color: theme.text,
    },
    actionTitle: {
      fontSize: 14,
      fontFamily: Fonts.sans.semiBold,
      fontWeight: '600',
      color: theme.text,
    },
    actionTitleDanger: {
      fontSize: 14,
      fontFamily: Fonts.sans.semiBold,
      fontWeight: '600',
      color: theme.danger,
    },
    actionSubtitle: {
      fontSize: 12,
      fontFamily: Fonts.sans.regular,
      color: theme.textSecondary,
      marginTop: 2,
      lineHeight: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 64,
    },
    comingSoonBadge: {
      backgroundColor: theme.pillGreenBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    comingSoonText: {
      fontSize: 11,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.pillGreenText,
    },
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceMuted,
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
      backgroundColor: theme.tintStrong,
    },
    segmentBtnText: {
      fontSize: 12,
      fontFamily: Fonts.sans.medium,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    segmentBtnTextActive: {
      fontSize: 12,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.onTint,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(30, 40, 30, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    dialogCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(50, 122, 76, 0.16)',
        },
        default: {
          shadowColor: theme.tintStrong,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 6,
        },
      }),
    },
    dialogIconWrapper: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.pillGreenBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    dialogIconWrapperDanger: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.dangerBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    dialogTitle: {
      fontSize: 18,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    dialogMessage: {
      fontSize: 14,
      fontFamily: Fonts.sans.regular,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    inputGroup: {
      width: '100%',
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 12,
      fontFamily: Fonts.sans.semiBold,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 4,
      marginLeft: 2,
    },
    textInput: {
      width: '100%',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: Fonts.sans.regular,
    },
    errorText: {
      fontSize: 12,
      fontFamily: Fonts.sans.medium,
      color: theme.danger,
      marginTop: 2,
      marginBottom: 10,
      textAlign: 'center',
    },
    dialogActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted,
    },
    cancelBtnText: {
      fontSize: 14,
      fontFamily: Fonts.sans.semiBold,
      fontWeight: '600',
      color: theme.text,
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.tintStrong,
    },
    saveBtnText: {
      fontSize: 14,
      fontFamily: Fonts.sans.semiBold,
      fontWeight: '600',
      color: theme.onTint,
    },
    logoutBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.danger,
    },
    logoutBtnText: {
      fontSize: 14,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    policyDialogCard: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '80%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      padding: 22,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(50, 122, 76, 0.16)',
        },
        default: {
          shadowColor: theme.tintStrong,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 6,
        },
      }),
    },
    policyHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 14,
      marginBottom: 14,
    },
    policyTitle: {
      fontSize: 18,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.text,
    },
    policySubtitle: {
      fontSize: 12,
      fontFamily: Fonts.sans.regular,
      color: theme.textSecondary,
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
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    policySectionBody: {
      fontSize: 13,
      fontFamily: Fonts.sans.regular,
      color: theme.textSecondary,
      lineHeight: 19,
    },
    policyDoneBtn: {
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: theme.tintStrong,
    },
    policyDoneBtnText: {
      fontSize: 14,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.onTint,
    },
  });
