import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import {
  vaultApi,
  PrescriptionResponse,
  LabTestResultResponse,
  HealthConditionResponse,
} from '@/api/vault.api';
import { Colors, Fonts } from '@/constants/theme';

const theme = Colors.light;

type VaultTab = 'prescriptions' | 'test-results' | 'conditions';

export default function VaultScreen() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<VaultTab>('prescriptions');
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [testResults, setTestResults] = useState<LabTestResultResponse[]>([]);
  const [conditions, setConditions] = useState<HealthConditionResponse[]>([]);
  const [prescriptionFilter, setPrescriptionFilter] = useState<'ACTIVE' | 'FULFILLED' | 'ALL'>('ACTIVE');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchTabContent = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    setIsLoading(true);
    try {
      if (activeTab === 'prescriptions') {
        const filter = prescriptionFilter === 'ALL' ? undefined : prescriptionFilter;
        const data = await vaultApi.getPrescriptions(filter);
        setPrescriptions(data);
      } else if (activeTab === 'test-results') {
        const data = await vaultApi.getTestResults();
        setTestResults(data);
      } else if (activeTab === 'conditions') {
        const data = await vaultApi.getConditions();
        setConditions(data);
      }
    } catch (err) {
      console.warn(`[Vault] Error loading ${activeTab}:`, err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, activeTab, prescriptionFilter]);

  // Refetch whenever the Vault tab regains focus (not just on mount/dep change),
  // so records saved during a doctor consultation show up immediately on return.
  useFocusEffect(
    useCallback(() => {
      fetchTabContent();
    }, [fetchTabContent])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTabContent();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Health Vault</Text>
          <Text style={styles.subtitle}>Every prescription, result, and condition, all in one place.</Text>
        </View>

        {/* Segmented Top Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'prescriptions' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('prescriptions')}
          >
            <Ionicons
              name="medkit"
              size={16}
              color={activeTab === 'prescriptions' ? theme.tintStrong : theme.textSecondary}
            />
            <Text style={activeTab === 'prescriptions' ? styles.segmentTextActive : styles.segmentText}>
              Prescriptions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'test-results' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('test-results')}
          >
            <Ionicons
              name="analytics"
              size={16}
              color={activeTab === 'test-results' ? theme.tintStrong : theme.textSecondary}
            />
            <Text style={activeTab === 'test-results' ? styles.segmentTextActive : styles.segmentText}>
              Test Results
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'conditions' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('conditions')}
          >
            <Ionicons
              name="list"
              size={16}
              color={activeTab === 'conditions' ? theme.tintStrong : theme.textSecondary}
            />
            <Text style={activeTab === 'conditions' ? styles.segmentTextActive : styles.segmentText}>
              Conditions
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Sub-tab 1: Prescriptions */}
          {activeTab === 'prescriptions' && (
            <View>
              {/* Filter Pills */}
              <View style={styles.filterRow}>
                {(['ACTIVE', 'FULFILLED', 'ALL'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterPill, prescriptionFilter === filter && styles.filterPillActive]}
                    onPress={() => setPrescriptionFilter(filter)}
                  >
                    <Text
                      style={
                        prescriptionFilter === filter ? styles.filterTextActive : styles.filterText
                      }
                    >
                      {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Fulfilled'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {isLoading ? (
                <ActivityIndicator color={theme.tintStrong} style={{ marginTop: 32 }} />
              ) : prescriptions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text" size={32} color={theme.textTertiary} />
                  <Text style={styles.emptyTitle}>No prescriptions found</Text>
                  <Text style={styles.emptyDesc}>
                    Prescriptions prescribed during doctor consultations will be visible here with dosages and instructions.
                  </Text>
                  {/* TODO: Flesh out UI - Add pharmacy pickup badge and QR code dispenser modal */}
                </View>
              ) : (
                <View style={styles.cardList}>
                  {prescriptions.map((p) => (
                    <View key={p.id} style={styles.prescriptionCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.medicationName}>{p.medicationName}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            p.status === 'ACTIVE' ? styles.statusActive : styles.statusFulfilled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              p.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextFulfilled,
                            ]}
                          >
                            {p.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.dosageText}>Dosage: {p.dosage}</Text>
                      <Text style={styles.instructionsText}>Instructions: {p.instructions}</Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.doctorText}>Prescribed by: {p.doctorName}</Text>
                        <Text style={styles.expiresText}>
                          Expires: {p.expiresAt ? p.expiresAt.slice(0, 10) : '—'}
                        </Text>
                      </View>
                      {/* TODO: Flesh out UI - Add 'Mark as Fulfilled' patient dispensing button */}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Sub-tab 2: Test Results & Biomarker Charts */}
          {activeTab === 'test-results' && (
            <View>
              {/* Chart Placeholder / Trend Skeleton */}
              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <Ionicons name="trending-up" size={20} color={theme.tintStrong} />
                  <Text style={styles.chartTitle}>Biomarker Time-Series Trends</Text>
                </View>
                <Text style={styles.chartDesc}>
                  Chronological measurements sorted ascending for trend analysis.
                </Text>

                {/* Interactive Chart Skeleton Canvas */}
                <View style={styles.chartCanvasPlaceholder}>
                  <Ionicons name="pulse" size={40} color={theme.tintStrong} />
                  <Text style={styles.chartPlaceholderNote}>
                    {testResults.length > 0
                      ? `Rendering trend graph for ${testResults.length} observation(s)`
                      : 'No biomarker points to plot yet'}
                  </Text>
                  {/* TODO: Flesh out UI - Plug in SVG line chart using react-native-svg or victory-native */}
                </View>
              </View>

              {isLoading ? (
                <ActivityIndicator color={theme.tintStrong} style={{ marginTop: 24 }} />
              ) : testResults.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="flask" size={32} color={theme.textTertiary} />
                  <Text style={styles.emptyTitle}>No diagnostic results</Text>
                  <Text style={styles.emptyDesc}>
                    Diagnostic lab observations (e.g. Glucose, Hemoglobin, Lipids) will be logged by your lab technician.
                  </Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {testResults.map((r) => (
                    <View key={r.id} style={styles.testResultCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.testName}>{r.testName}</Text>
                        <Text style={styles.testValue}>
                          {r.numericValue} {r.unit}
                        </Text>
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.doctorText}>Attending: {r.doctorName}</Text>
                        <Text style={styles.expiresText}>
                          Date: {r.recordedAt ? r.recordedAt.slice(0, 10) : ''}
                        </Text>
                      </View>
                      {/* TODO: Flesh out UI - Add reference range thresholds (Normal/High/Low) and indicator pills */}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Sub-tab 3: Baseline Conditions & Records */}
          {activeTab === 'conditions' && (
            <View>
              {isLoading ? (
                <ActivityIndicator color={theme.tintStrong} style={{ marginTop: 32 }} />
              ) : conditions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="folder-open" size={32} color={theme.textTertiary} />
                  <Text style={styles.emptyTitle}>No conditions declared</Text>
                  <Text style={styles.emptyDesc}>
                    Keep foundational medical allergies, chronic diseases, and past surgeries recorded here.
                  </Text>
                  {/* TODO: Flesh out UI - Add 'Add Condition' patient input modal */}
                </View>
              ) : (
                <View style={styles.cardList}>
                  {conditions.map((c) => (
                    <View key={c.id} style={styles.conditionCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.conditionTitle}>{c.title}</Text>
                        <View style={styles.sourceBadge}>
                          <Text style={styles.sourceText}>
                            {c.sourceType ? c.sourceType.replace('_', ' ') : 'PATIENT'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.conditionType}>
                        Type: {c.type ? c.type.replace('_', ' ') : 'CONDITION'}
                      </Text>
                      <Text style={styles.conditionDate}>
                        Diagnosed / Recorded: {c.dateRecorded || (c.createdAt ? c.createdAt.slice(0, 10) : '')}
                      </Text>
                      {/* TODO: Flesh out UI - Add delete button for patient-declared records */}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16, maxWidth: 640, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 4 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceMuted,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: theme.backgroundElement,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(50, 122, 76, 0.10)',
      },
      default: {
        shadowColor: theme.tintStrong,
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  segmentText: { fontSize: 13, fontFamily: Fonts.sans.medium, color: theme.textSecondary, fontWeight: '500' },
  segmentTextActive: { fontSize: 13, fontFamily: Fonts.sans.bold, color: theme.tintStrong, fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.surfaceMuted,
  },
  filterPillActive: { backgroundColor: theme.tint },
  filterText: { fontSize: 12, fontFamily: Fonts.sans.medium, color: theme.textSecondary, fontWeight: '500' },
  filterTextActive: { fontSize: 12, fontFamily: Fonts.sans.semiBold, color: theme.onTint, fontWeight: '600' },
  cardList: { gap: 12 },
  prescriptionCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medicationName: { fontSize: 16, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: theme.pillGreenBg },
  statusFulfilled: { backgroundColor: theme.surfaceMuted },
  statusText: { fontSize: 11, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  statusTextActive: { color: theme.pillGreenText },
  statusTextFulfilled: { color: theme.textSecondary },
  dosageText: { fontSize: 13, fontFamily: Fonts.sans.medium, color: theme.text, fontWeight: '500', marginBottom: 4 },
  instructionsText: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginBottom: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 },
  doctorText: { fontSize: 11, fontFamily: Fonts.sans.regular, color: theme.textTertiary },
  expiresText: { fontSize: 11, fontFamily: Fonts.sans.regular, color: theme.textTertiary },
  emptyCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyTitle: { fontSize: 15, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text, marginTop: 8, marginBottom: 4 },
  emptyDesc: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, textAlign: 'center', lineHeight: 17 },
  chartContainer: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  chartTitle: { fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  chartDesc: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginBottom: 16 },
  chartCanvasPlaceholder: {
    height: 140,
    backgroundColor: theme.pillGreenBg,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.tint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chartPlaceholderNote: { fontSize: 12, fontFamily: Fonts.sans.medium, color: theme.tintStrong, fontWeight: '500' },
  testResultCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  testName: { fontSize: 15, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text },
  testValue: { fontSize: 16, fontFamily: Fonts.sans.extraBold, fontWeight: '800', color: theme.tintStrong },
  conditionCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  conditionTitle: { fontSize: 15, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text },
  sourceBadge: { backgroundColor: theme.surfaceMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 10, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase' },
  conditionType: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 4 },
  conditionDate: { fontSize: 11, fontFamily: Fonts.sans.regular, color: theme.textTertiary, marginTop: 2 },
});
