import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { vaultApi, HealthConditionResponse } from '@/api/vault.api';
import { Colors, Fonts } from '@/constants/theme';

const theme = Colors.light;

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, refreshUser, isAuthenticated } = useAuth();

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const hours = time.getHours();
  const timeOfDay = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  const [conditions, setConditions] = useState<HealthConditionResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    try {
      const conditionList = await vaultApi.getConditions();
      setConditions(conditionList);
    } catch (err) {
      console.warn('[Home] Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Re-pull the user and their conditions whenever Home regains focus, so
  // finishing the onboarding survey (or a doctor updating the vault) shows
  // up immediately without needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshUser();
        loadData();
      }
    }, [isAuthenticated])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isBaselineIncomplete = !user?.gender;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header Card */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>{timeOfDay},</Text>
            <Text style={styles.patientName}>{user?.fullName || 'Patient'}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={theme.onTint} />
          </TouchableOpacity>
        </View>

        {/* Incomplete Baseline Banner */}
        {isBaselineIncomplete && (
          <TouchableOpacity
            style={styles.incompleteBanner}
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.85}
          >
            <View style={styles.bannerIconContainer}>
              <Ionicons name="medkit" size={22} color={theme.tintStrong} />
            </View>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTitleRow}>
                <Text style={styles.bannerTitle}>Complete your medical baseline</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.tintStrong} />
              </View>
              <Text style={styles.bannerSubtitle}>
                Add your biometrics, allergies, and lifestyle factors so doctors have your baseline ready.
              </Text>
              <Text style={styles.bannerActionText}>Start survey →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Patient Identity Badge Card */}
        <View style={styles.identityCard}>
          <View style={styles.badgePills}>
            <View style={styles.bloodBadge}>
              <Ionicons name="water" size={14} color={theme.tintStrong} />
              <Text style={styles.bloodText}>Blood type {user?.bloodType || 'Unknown'}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.pillPeachText} />
              <Text style={styles.roleText}>Verified</Text>
            </View>
            {user?.gender ? (
              <View style={styles.genderBadge}>
                <Text style={styles.genderText}>{user.gender.replace('_', ' ')}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.identityDetail}>Email: {user?.email || '—'}</Text>
          {user?.dateOfBirth && (
            <Text style={styles.identityDetail}>Date of Birth: {user.dateOfBirth}</Text>
          )}

          {/* Biometrics Stat Row (Height, Weight) */}
          {user?.heightCm || user?.weightKg ? (
            <View style={styles.biometricsRow}>
              {user?.heightCm ? (
                <View style={styles.biometricStat}>
                  <Ionicons name="resize-outline" size={14} color={theme.tintStrong} />
                  <Text style={styles.biometricLabel}>Height:</Text>
                  <Text style={styles.biometricValue}>{user.heightCm} cm</Text>
                </View>
              ) : null}
              {user?.weightKg ? (
                <View style={styles.biometricStat}>
                  <Ionicons name="barbell-outline" size={14} color={theme.tintStrong} />
                  <Text style={styles.biometricLabel}>Weight:</Text>
                  <Text style={styles.biometricValue}>{user.weightKg} kg</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Quick CTA to Consultation */}
          <TouchableOpacity
            style={styles.consultationCta}
            onPress={() => router.push('/(tabs)/consultation')}
          >
            <Ionicons name="key" size={18} color={theme.onTint} />
            <Text style={styles.consultationCtaText}>Generate doctor access PIN →</Text>
          </TouchableOpacity>
        </View>

        {/* Health Timeline Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your health timeline</Text>
          <Text style={styles.sectionCount}>
            {conditions.length} record{conditions.length === 1 ? '' : 's'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.tintStrong} style={{ marginTop: 24 }} />
        ) : conditions.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="pulse" size={32} color={theme.textTertiary} />
            <Text style={styles.placeholderTitle}>No timeline records yet</Text>
            <Text style={styles.placeholderText}>
              Baseline conditions, verified allergies, and clinical encounter visits from your doctor will appear here.
            </Text>
            {/* TODO: Flesh out UI - Add Timeline filter, empty state actions & illustration */}
          </View>
        ) : (
          <View style={styles.timelineList}>
            {conditions.map((item) => (
              <View key={item.id} style={styles.timelineItemCard}>
                <View style={styles.timelineIconWrapper}>
                  <Ionicons
                    name={item.type === 'ALLERGY' ? 'warning' : 'medkit'}
                    size={20}
                    color={theme.tintStrong}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemType}>{item.type ? item.type.replace('_', ' ') : 'CONDITION'}</Text>
                  </View>
                  <Text style={styles.itemSource}>
                    Source: {item.sourceType === 'DOCTOR_VERIFIED' ? 'Doctor Verified' : 'Patient Declared'}
                  </Text>
                  <Text style={styles.itemDate}>Recorded: {item.dateRecorded || (item.createdAt ? item.createdAt.slice(0, 10) : '')}</Text>
                </View>
                {/* TODO: Flesh out UI - Connect to detailed condition modal or clinical note viewer */}
              </View>
            ))}
          </View>
        )}

        {/* Skeleton Section for Future Clinical Encounters */}
        <View style={styles.encountersSkeleton}>
          <Text style={styles.skeletonTitle}>Clinical encounters & doctor notes</Text>
          <Text style={styles.skeletonSubtitle}>
            Visit summaries and doctor diagnoses are automatically appended upon consultation completion.
          </Text>
          {/* TODO: Flesh out UI - Connect to encounters endpoint and render encounter accordion cards */}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxWidth: 600, alignSelf: 'center', width: '100%' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.tintStrong,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 18,
  },
  welcomeSubtitle: { fontSize: 13, fontFamily: Fonts.sans.medium, color: 'rgba(255, 253, 247, 0.8)' },
  patientName: { fontSize: 24, fontFamily: Fonts.display, fontWeight: '800', color: '#FFFDF7', marginTop: 2 },
  settingsButton: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  identityCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
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
    marginBottom: 24,
  },
  badgePills: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bloodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.pillGreenBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bloodText: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.pillGreenText },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.pillPeachBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.pillPeachText },
  genderBadge: { backgroundColor: theme.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  genderText: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.textSecondary, textTransform: 'capitalize' },
  identityDetail: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginBottom: 4 },
  biometricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  biometricStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  biometricLabel: { fontSize: 12, fontFamily: Fonts.sans.medium, color: theme.textSecondary, fontWeight: '500' },
  biometricValue: { fontSize: 13, fontFamily: Fonts.sans.bold, color: theme.text, fontWeight: '700' },
  incompleteBanner: {
    backgroundColor: theme.pillGreenBg,
    borderWidth: 1.5,
    borderColor: theme.tint,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(50, 122, 76, 0.08)',
      },
      default: {
        shadowColor: theme.tintStrong,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  bannerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: { flex: 1 },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  bannerTitle: { fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.tintStrong, flex: 1 },
  bannerSubtitle: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.pillGreenText, lineHeight: 18, marginBottom: 8 },
  bannerActionText: { fontSize: 13, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.tintStrong, alignSelf: 'flex-start' },
  consultationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.tintStrong,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
  },
  consultationCtaText: { color: theme.onTint, fontSize: 14, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  sectionCount: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textTertiary },
  placeholderCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 20,
  },
  placeholderTitle: { fontSize: 15, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text, marginTop: 8, marginBottom: 4 },
  placeholderText: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, textAlign: 'center', lineHeight: 17 },
  timelineList: { gap: 10, marginBottom: 20 },
  timelineItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  timelineIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.pillGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text },
  itemType: { fontSize: 10, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.tintStrong, textTransform: 'uppercase' },
  itemSource: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 2 },
  itemDate: { fontSize: 11, fontFamily: Fonts.sans.regular, color: theme.textTertiary, marginTop: 2 },
  encountersSkeleton: {
    backgroundColor: theme.surfaceMuted,
    borderRadius: 12,
    padding: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.border,
  },
  skeletonTitle: { fontSize: 14, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text, marginBottom: 4 },
  skeletonSubtitle: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, lineHeight: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 40, 30, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
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
    backgroundColor: theme.backgroundElement,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.text,
  },
  logoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.tintStrong,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.onTint,
  },
});
