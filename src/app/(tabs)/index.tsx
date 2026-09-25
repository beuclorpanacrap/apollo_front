import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useVault } from '@/context/vault-context';
import { BrandColors, Colors, Fonts } from '@/constants/theme';
import { EntryCard } from '@/components/vault/entry-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge, IconBubble } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { ClinicalEncounterSummaryDto } from '@/api/vault.api';
import { formatDateLabel, type VaultDisplayEntry } from '@/utils/vault-display';

const theme = Colors.light;

type TimelineItem =
  | { type: 'entry'; id: string; sortKey: string; entry: VaultDisplayEntry }
  | { type: 'encounter'; id: string; sortKey: string; encounter: ClinicalEncounterSummaryDto };

function EncounterTimelineCard({ encounter }: { encounter: ClinicalEncounterSummaryDto }) {
  const subtitle = [encounter.doctorName, encounter.doctorSpecialty].filter(Boolean).join(' · ');

  return (
    <Card accentColor={BrandColors.deepGreen} style={styles.timelineEncounterCard}>
      <View style={styles.timelineEncounterRow}>
        <IconBubble icon="calendar" bg={theme.pillGreenBg} fg={theme.tintStrong} />
        <View style={styles.timelineEncounterBody}>
          <View style={styles.timelineEncounterTitleRow}>
            <Text style={styles.timelineEncounterTitle} numberOfLines={1}>
              {encounter.diagnosis || 'Doctor visit'}
            </Text>
            <Text style={styles.timelineEncounterDate}>
              {formatDateLabel(encounter.encounterDate ?? encounter.createdAt)}
            </Text>
          </View>
          {subtitle ? <Text style={styles.timelineEncounterSubtitle}>{subtitle}</Text> : null}
          <View style={styles.timelineEncounterBadge}>
            <Badge label="Doctor visit" bg={theme.pillGreenBg} fg={theme.pillGreenText} icon="shield-checkmark" />
          </View>
        </View>
      </View>
    </Card>
  );
}

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

  const { conditionEntries, prescriptionEntries, labResultEntries, encounters, isLoading, isRefreshing, refresh } = useVault();
  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);

  const recentHighlights = useMemo(() => {
    const entries: TimelineItem[] = [
      ...prescriptionEntries,
      ...labResultEntries,
      ...conditionEntries,
    ].map((entry): TimelineItem => ({ type: 'entry', id: `entry-${entry.kind}-${entry.id}`, sortKey: entry.sortKey, entry }));
    const visits: TimelineItem[] = encounters.map((encounter): TimelineItem => ({
      type: 'encounter',
      id: `encounter-${encounter.id ?? `${encounter.diagnosis ?? 'visit'}-${encounter.encounterDate ?? ''}`}`,
      sortKey: encounter.encounterDate ?? encounter.createdAt ?? '',
      encounter,
    }));
    return [...entries, ...visits]
      .sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
      .slice(0, 3);
  }, [prescriptionEntries, labResultEntries, conditionEntries, encounters]);

  // Re-pull the user and their vault whenever Home regains focus, so
  // finishing the onboarding survey, a doctor's visit, or logging a visit
  // shows up immediately without needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshUser();
        refresh();
      }
    }, [isAuthenticated])
  );

  const onRefresh = async () => {
    await Promise.all([refreshUser(), refresh()]);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    router.replace('/welcome');
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
            style={styles.logoutButton}
            onPress={() => setShowLogoutDialog(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out" size={20} color={theme.onTint} />
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

        {/* Shortcut: one tap straight to Prescriptions instead of Vault → tab */}
        <TouchableOpacity
          style={styles.shortcutButton}
          onPress={() => router.push({ pathname: '/(tabs)/vault', params: { tab: 'prescriptions' } })}
          activeOpacity={0.85}
        >
          <View style={styles.shortcutIconWrap}>
            <Ionicons name="medical" size={18} color={theme.onTint} />
          </View>
          <Text style={styles.shortcutTitle}>Jump to Prescriptions</Text>
          <Ionicons name="arrow-forward-circle" size={22} color={theme.onTint} />
        </TouchableOpacity>

        {/* Health Timeline Section — 3 most recent entries across the vault */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your health timeline</Text>
        </View>
        <Text style={styles.sectionCaption}>Latest prescriptions, results, conditions, and doctor visits.</Text>

        {isLoading ? (
          <ActivityIndicator color={theme.tintStrong} style={{ marginTop: 24 }} />
        ) : recentHighlights.length === 0 ? (
          <EmptyState
            icon="pulse"
            title="Nothing here yet"
            description="Prescriptions, test results, conditions, and doctor visits will show up here."
            actionLabel="Open your vault"
            onAction={() => router.push('/(tabs)/vault')}
          />
        ) : (
          <View style={styles.timelineList}>
            {recentHighlights.map((item) => (
              item.type === 'encounter' ? (
                <EncounterTimelineCard key={item.id} encounter={item.encounter} />
              ) : (
                <EntryCard key={item.id} entry={item.entry} showKindLabel />
              )
            ))}
          </View>
        )}
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <Modal
        visible={showLogoutDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrapper}>
              <Ionicons name="log-out" size={28} color={theme.tintStrong} />
            </View>
            <Text style={styles.dialogTitle}>Log Out</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to end your current session?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogoutDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  logoutButton: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
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
  shortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.tintStrong,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  shortcutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: { flex: 1, fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.onTint },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  sectionCaption: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textTertiary, marginBottom: 12 },
  timelineList: { gap: 10, marginBottom: 20 },
  timelineEncounterCard: { marginBottom: 0 },
  timelineEncounterRow: { flexDirection: 'row', gap: 12 },
  timelineEncounterBody: { flex: 1, minWidth: 0 },
  timelineEncounterTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  timelineEncounterTitle: { flex: 1, fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  timelineEncounterDate: { fontSize: 11, fontFamily: Fonts.sans.medium, color: theme.textTertiary },
  timelineEncounterSubtitle: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 3 },
  timelineEncounterBadge: { alignSelf: 'flex-start', marginTop: 8 },
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
