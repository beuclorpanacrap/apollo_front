import React, { useState, useMemo } from 'react';
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
import { useThemeContext } from '@/hooks/use-theme';
import { ThemeMode } from '@/context/theme-context';
import { ThemedDatePicker } from '@/components/themed-date-picker';
import { vaultApi } from '@/api/vault.api';
import { AppTheme } from '@/constants/theme';

interface PolicyModalContent {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, refreshUser, updateUserLocally } = useAuth();
  const { theme, themeMode, setThemeMode, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const badgeIconColor = isDark ? '#34D399' : '#246B44';

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: theme.surfaceMuted }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Section 1: Account & Profile */}
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
            ACCOUNT & PROFILE
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Full Name Row */}
            <TouchableOpacity
              style={styles.interactiveRow}
              onPress={openNameModal}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="person-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Full Name</Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>
                  {user?.fullName || 'Patient'}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Email Address Row */}
            <TouchableOpacity
              style={styles.interactiveRow}
              onPress={openEmailModal}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="mail-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Email Address</Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>
                  {user?.email || '—'}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Date of Birth Row */}
            <TouchableOpacity
              style={styles.interactiveRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="calendar-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Date of Birth</Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>
                  {user?.dateOfBirth || 'Select date'}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Section 2: Medical Baseline & Data */}
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
            MEDICAL BASELINE & DATA
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="medkit-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>
                  Clinical Baseline & Biometrics
                </Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Update gender, height, weight, allergies, and habits
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExport}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="download-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Export Health Summary</Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Download encrypted patient records (PDF/FHIR)
                </Text>
              </View>
              <View style={[styles.comingSoonBadge, { backgroundColor: theme.pillGreenBg }]}>
                <Text style={[styles.comingSoonText, { color: theme.tint }]}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 3: Preferences */}
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>PREFERENCES</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.iconBadge}>
                <Ionicons name="color-palette-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Theme</Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Appearance display mode
                </Text>
              </View>
              <View
                style={[
                  styles.segmentedContainer,
                  { backgroundColor: theme.surfaceMuted },
                ]}
              >
                {(['System', 'Light', 'Dark'] as ThemeMode[]).map((mode) => {
                  const isSelected = themeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.segmentBtn,
                        isSelected && { backgroundColor: theme.tintStrong },
                      ]}
                      onPress={() => setThemeMode(mode)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          {
                            color: isSelected ? theme.onTint : theme.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.row}>
              <View style={styles.iconBadge}>
                <Ionicons name="finger-print-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Biometric Lock</Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Require FaceID / TouchID on app launch
                </Text>
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
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
            LEGAL & POLICIES
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionRow}
              onPress={openPrivacyPolicy}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="shield-checkmark-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Privacy Policy</Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Apollo patient data sovereignty commitment
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={openTermsOfService}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="document-text-outline" size={20} color={badgeIconColor} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Terms of Service</Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Cryptographic records & consultation terms
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Section 5: Session Action */}
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>SESSION</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(211, 47, 47, 0.10)' }]}>
                <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.actionTitle, { color: theme.danger }]}>Log Out</Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  Sign out of this device session
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
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
          <View style={[styles.dialogCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.dialogIconWrapper}>
              <Ionicons name="person-outline" size={24} color={badgeIconColor} />
            </View>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Edit Full Name</Text>
            <Text style={[styles.dialogMessage, { color: theme.textSecondary }]}>
              Update your preferred name on your medical vault records.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>First Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="First name"
                placeholderTextColor={theme.textTertiary}
                value={firstNameInput}
                onChangeText={setFirstNameInput}
                editable={!isSavingName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Last Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Last name"
                placeholderTextColor={theme.textTertiary}
                value={lastNameInput}
                onChangeText={setLastNameInput}
                editable={!isSavingName}
              />
            </View>

            {nameError && <Text style={[styles.errorText, { color: theme.danger }]}>{nameError}</Text>}

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowNameModal(false)}
                disabled={isSavingName}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.tintStrong }]}
                onPress={handleSaveName}
                disabled={isSavingName}
                activeOpacity={0.8}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.onTint }]}>Save</Text>
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
          <View style={[styles.dialogCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.dialogIconWrapper}>
              <Ionicons name="mail-outline" size={24} color={badgeIconColor} />
            </View>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Edit Email Address</Text>
            <Text style={[styles.dialogMessage, { color: theme.textSecondary }]}>
              Update the email address associated with your account.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
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

            {emailError && <Text style={[styles.errorText, { color: theme.danger }]}>{emailError}</Text>}

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowEmailModal(false)}
                disabled={isSavingEmail}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.tintStrong }]}
                onPress={handleSaveEmail}
                disabled={isSavingEmail}
                activeOpacity={0.8}
              >
                {isSavingEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.onTint }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Themed Date Picker for Date of Birth */}
      <ThemedDatePicker
        visible={showDatePicker}
        value={user?.dateOfBirth ? new Date(`${user.dateOfBirth}T12:00:00`) : null}
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
          <View style={[styles.dialogCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.dialogIconWrapper, { backgroundColor: theme.dangerBg }]}>
              <Ionicons name="log-out-outline" size={26} color={theme.danger} />
            </View>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Sign Out?</Text>
            <Text style={[styles.dialogMessage, { color: theme.textSecondary }]}>
              Are you sure you want to log out of your Apollo health vault on this device?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.surfaceMuted }]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: theme.danger }]}
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
          <View
            style={[
              styles.policyDialogCard,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          >
            <View style={[styles.policyHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.policyTitle, { color: theme.text }]}>
                  {policyModal?.title}
                </Text>
                <Text style={[styles.policySubtitle, { color: theme.textSecondary }]}>
                  {policyModal?.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPolicyModal(null)}
                style={styles.policyCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.policyScroll}
              showsVerticalScrollIndicator={false}
            >
              {policyModal?.sections.map((sec, idx) => (
                <View key={idx} style={styles.policySection}>
                  <Text style={[styles.policySectionHeading, { color: theme.text }]}>
                    {sec.heading}
                  </Text>
                  <Text style={[styles.policySectionBody, { color: theme.textSecondary }]}>
                    {sec.body}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.policyDoneBtn, { backgroundColor: theme.tintStrong }]}
              onPress={() => setPolicyModal(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.policyDoneBtnText, { color: theme.onTint }]}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date of Birth Picker Modal */}
      <ThemedDatePicker
        visible={showDatePicker}
        value={parseIsoDate(user?.dateOfBirth)}
        onClose={() => setShowDatePicker(false)}
        onChange={handleDateSelect}
        maximumDate={new Date()}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme, isDark: boolean) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 22,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
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
  interactiveRow: {
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(36, 107, 68, 0.10)',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentBtnText: {
    fontSize: 12,
  },

  // Modals Overlay & Dialogs
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  dialogIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(36, 107, 68, 0.10)',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  dialogMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 2,
  },
  textInput: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingBottom: 14,
    marginBottom: 14,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  policySubtitle: {
    fontSize: 12,
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
    marginBottom: 4,
  },
  policySectionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  policyDoneBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  policyDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
