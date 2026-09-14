import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { vaultApi, HealthConditionResponse } from '@/api/vault.api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  const [conditions, setConditions] = useState<HealthConditionResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);

  const loadData = async () => {
    try {
      await refreshUser();
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
    loadData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header Card */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>Welcome back,</Text>
            <Text style={styles.patientName}>{user?.fullName || 'Patient'}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutDialog(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Patient Identity Badge Card */}
        <View style={styles.identityCard}>
          <View style={styles.badgePills}>
            <View style={styles.bloodBadge}>
              <Ionicons name="water" size={14} color="#D32F2F" />
              <Text style={styles.bloodText}>Blood Type: {(user as any)?.bloodType || 'O+'}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Verified Patient</Text>
            </View>
          </View>

          <Text style={styles.identityDetail}>Email: {user?.email || '—'}</Text>
          {(user as any)?.dateOfBirth && (
            <Text style={styles.identityDetail}>Date of Birth: {(user as any).dateOfBirth}</Text>
          )}

          {/* Quick CTA to Consultation */}
          <TouchableOpacity
            style={styles.consultationCta}
            onPress={() => router.push('/(tabs)/consultation')}
          >
            <Ionicons name="key-outline" size={18} color="#fff" />
            <Text style={styles.consultationCtaText}>Generate Doctor Access PIN →</Text>
          </TouchableOpacity>
        </View>

        {/* Consolidated Health Timeline Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Consolidated Health Timeline</Text>
          <Text style={styles.sectionCount}>
            {conditions.length} record{conditions.length === 1 ? '' : 's'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#4CAF7D" style={{ marginTop: 24 }} />
        ) : conditions.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="pulse-outline" size={32} color="#AAA" />
            <Text style={styles.placeholderTitle}>No Timeline Records Yet</Text>
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
                    name={item.type === 'ALLERGY' ? 'warning-outline' : 'medkit-outline'}
                    size={20}
                    color="#4CAF7D"
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
          <Text style={styles.skeletonTitle}>Clinical Encounters & Doctor Notes</Text>
          <Text style={styles.skeletonSubtitle}>
            Visit summaries and doctor diagnoses are automatically appended upon consultation completion.
          </Text>
          {/* TODO: Flesh out UI - Connect to encounters endpoint and render encounter accordion cards */}
        </View>
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
              <Ionicons name="log-out-outline" size={28} color="#D32F2F" />
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
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxWidth: 600, alignSelf: 'center', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  welcomeSubtitle: { fontSize: 13, color: '#777' },
  patientName: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  logoutButton: { padding: 8, borderRadius: 8, backgroundColor: '#EEEEEE' },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  badgePills: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bloodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bloodText: { fontSize: 12, fontWeight: '600', color: '#C62828' },
  roleBadge: { backgroundColor: '#EAF7EF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#2E7D51' },
  identityDetail: { fontSize: 13, color: '#555', marginBottom: 4 },
  consultationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF7D',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
  },
  consultationCtaText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  sectionCount: { fontSize: 12, color: '#888' },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 20,
  },
  placeholderTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 4 },
  placeholderText: { fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 17 },
  timelineList: { gap: 10, marginBottom: 20 },
  timelineItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    gap: 12,
  },
  timelineIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  itemType: { fontSize: 10, fontWeight: '700', color: '#4CAF7D', textTransform: 'uppercase' },
  itemSource: { fontSize: 12, color: '#666', marginTop: 2 },
  itemDate: { fontSize: 11, color: '#999', marginTop: 2 },
  encountersSkeleton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  skeletonTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  skeletonSubtitle: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  dialogIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#666',
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
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  logoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
