import React, { useState, useEffect, useCallback } from 'react';
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
          <Text style={styles.subtitle}>Immutable clinical records and diagnostic observations.</Text>
        </View>

        {/* Segmented Top Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'prescriptions' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('prescriptions')}
          >
            <Ionicons
              name="medkit-outline"
              size={16}
              color={activeTab === 'prescriptions' ? '#2E7D51' : '#666'}
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
              name="analytics-outline"
              size={16}
              color={activeTab === 'test-results' ? '#2E7D51' : '#666'}
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
              name="list-outline"
              size={16}
              color={activeTab === 'conditions' ? '#2E7D51' : '#666'}
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
                <ActivityIndicator color="#4CAF7D" style={{ marginTop: 32 }} />
              ) : prescriptions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={32} color="#AAA" />
                  <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
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
                  <Ionicons name="trending-up-outline" size={20} color="#4CAF7D" />
                  <Text style={styles.chartTitle}>Biomarker Time-Series Trends</Text>
                </View>
                <Text style={styles.chartDesc}>
                  Chronological measurements sorted ascending for trend analysis.
                </Text>

                {/* Interactive Chart Skeleton Canvas */}
                <View style={styles.chartCanvasPlaceholder}>
                  <Ionicons name="pulse" size={40} color="#4CAF7D" />
                  <Text style={styles.chartPlaceholderNote}>
                    {testResults.length > 0
                      ? `Rendering trend graph for ${testResults.length} observation(s)`
                      : 'No biomarker points to plot yet'}
                  </Text>
                  {/* TODO: Flesh out UI - Plug in SVG line chart using react-native-svg or victory-native */}
                </View>
              </View>

              {isLoading ? (
                <ActivityIndicator color="#4CAF7D" style={{ marginTop: 24 }} />
              ) : testResults.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="flask-outline" size={32} color="#AAA" />
                  <Text style={styles.emptyTitle}>No Diagnostic Results</Text>
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
                <ActivityIndicator color="#4CAF7D" style={{ marginTop: 32 }} />
              ) : conditions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="folder-open-outline" size={32} color="#AAA" />
                  <Text style={styles.emptyTitle}>No Conditions Declared</Text>
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
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16, maxWidth: 640, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
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
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  segmentText: { fontSize: 13, color: '#666', fontWeight: '500' },
  segmentTextActive: { fontSize: 13, color: '#2E7D51', fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EAEAEA',
  },
  filterPillActive: { backgroundColor: '#4CAF7D' },
  filterText: { fontSize: 12, color: '#555', fontWeight: '500' },
  filterTextActive: { fontSize: 12, color: '#fff', fontWeight: '600' },
  cardList: { gap: 12 },
  prescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medicationName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: '#EAF7EF' },
  statusFulfilled: { backgroundColor: '#F0F0F0' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#2E7D51' },
  statusTextFulfilled: { color: '#666' },
  dosageText: { fontSize: 13, color: '#333', fontWeight: '500', marginBottom: 4 },
  instructionsText: { fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F4F4F4', paddingTop: 8 },
  doctorText: { fontSize: 11, color: '#888' },
  expiresText: { fontSize: 11, color: '#888' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 4 },
  emptyDesc: { fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 17 },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  chartDesc: { fontSize: 12, color: '#666', marginBottom: 16 },
  chartCanvasPlaceholder: {
    height: 140,
    backgroundColor: '#F9FAF9',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chartPlaceholderNote: { fontSize: 12, color: '#4CAF7D', fontWeight: '500' },
  testResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  testName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  testValue: { fontSize: 16, fontWeight: '800', color: '#4CAF7D' },
  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  conditionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  sourceBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 10, fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' },
  conditionType: { fontSize: 12, color: '#555', marginTop: 4 },
  conditionDate: { fontSize: 11, color: '#888', marginTop: 2 },
});
