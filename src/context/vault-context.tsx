import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  vaultApi,
  type ClinicalEncounterSummaryDto,
  type CreateHealthConditionRequest,
  type HealthConditionResponse,
  type LabResultValueRequest,
  type LabTestResultResponse,
  type PrescriptionResponse,
} from '@/api/vault.api';
import { getTemplate } from '@/components/templates';
import { allFields, parseReference } from '@/components/evaluate';
import { visionApi, type VisionPrescriptionResponse } from '@/api/vision.api';
import { useAuth } from '@/context/auth-context';
import { patientContext } from '@/utils/patient-context';
import { recordedAtFor } from '@/utils/recorded-at';
import { groupRemoteLabs, type RemoteLabGroup } from '@/utils/remote-panels';
import type {
  LocalLabResult,
  LocalLabResultDraft,
  LocalPrescription,
  LocalPrescriptionDraft,
  PatientConditionStatus,
} from '@/types/local-records';
import {
  createLocalLabResult,
  createLocalPrescription,
  deleteLocalLabResult,
  deleteLocalPrescription,
  deleteLocalConditionStatus,
  getLocalConditionStatuses,
  getLocalLabResults,
  getLocalPrescriptions,
  updateLocalLabResult,
  updateLocalPrescription,
  updateLocalPrescriptionStatus,
  setLocalConditionStatus,
  setLocalRecordsScope,
  clearActiveScope,
} from '@/utils/local-records-store';
import {
  conditionToDisplayEntry,
  labGroupToDisplayEntry,
  labResultToDisplayEntry,
  localLabResultToDisplayEntry,
  localPrescriptionToDisplayEntry,
  prescriptionToDisplayEntry,
  sortByDateDesc,
  visionToDisplayEntry,
  type VaultDisplayEntry,
} from '@/utils/vault-display';

interface VaultContextType {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Raw backend/local data, for screens that need the unshaped record.
  conditions: HealthConditionResponse[];
  encounters: ClinicalEncounterSummaryDto[]; // fetched but not shown anywhere right now — see LOCAL_BRIDGE_NOTES.md
  prescriptions: PrescriptionResponse[];
  testResults: LabTestResultResponse[];
  /** Glasses prescriptions issued by doctors (read-only for the patient). */
  visionPrescriptions: VisionPrescriptionResponse[];
  localPrescriptions: LocalPrescription[];
  localLabResults: LocalLabResult[];
  /** Doctor-entered template results, put back together from the per-value backend records. */
  remoteLabGroups: RemoteLabGroup[];

  // Normalized, merged views for rendering.
  conditionEntries: VaultDisplayEntry[];
  conditionStatuses: Record<string, PatientConditionStatus>;
  prescriptionEntries: VaultDisplayEntry[]; // doctor rx + local rx
  visionEntries: VaultDisplayEntry[];
  labResultEntries: VaultDisplayEntry[]; // doctor labs + local labs

  refresh: () => Promise<void>;
  getLocalPrescriptionById: (id: string) => LocalPrescription | undefined;
  getLocalLabResultById: (id: string) => LocalLabResult | undefined;
  addPrescription: (draft: LocalPrescriptionDraft) => Promise<LocalPrescription>;
  editPrescription: (id: string, draft: LocalPrescriptionDraft) => Promise<LocalPrescription | undefined>;
  removePrescription: (id: string) => Promise<void>;
  setPrescriptionStatus: (id: string, isLocal: boolean, status: 'ACTIVE' | 'FULFILLED') => Promise<void>;
  addLabResult: (draft: LocalLabResultDraft) => Promise<LocalLabResult>;
  editLabResult: (id: string, draft: LocalLabResultDraft) => Promise<LocalLabResult | undefined>;
  removeLabResult: (id: string) => Promise<void>;
  addCondition: (input: CreateHealthConditionRequest) => Promise<void>;
  deleteConditionEntry: (id: string) => Promise<void>;
  updateConditionStatus: (id: string, status: PatientConditionStatus) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const [conditions, setConditions] = useState<HealthConditionResponse[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounterSummaryDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [testResults, setTestResults] = useState<LabTestResultResponse[]>([]);
  const [visionPrescriptions, setVisionPrescriptions] = useState<VisionPrescriptionResponse[]>([]);
  const [localPrescriptions, setLocalPrescriptions] = useState<LocalPrescription[]>([]);
  const [localLabResults, setLocalLabResults] = useState<LocalLabResult[]>([]);
  const [conditionStatuses, setConditionStatuses] = useState<Record<string, PatientConditionStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    setError(null);
    try {
      const scopeId = user?.userId || user?.profileId || user?.email;
      setLocalRecordsScope(scopeId);
      const [timeline, rx, labs, vision, localRx, localLabs, savedConditionStatuses] = await Promise.all([
        vaultApi.getTimeline(),
        vaultApi.getPrescriptions().catch(() => [] as PrescriptionResponse[]),
        vaultApi.getTestResults().catch(() => [] as LabTestResultResponse[]),
        // Like rx and labs, a failure here must not break the rest of the vault (a server without this endpoint just has none).
        visionApi.list().catch(() => [] as VisionPrescriptionResponse[]),
        getLocalPrescriptions(),
        getLocalLabResults(),
        getLocalConditionStatuses(),
      ]);
      setConditions(timeline.conditions ?? []);
      setEncounters(timeline.encounters ?? []);
      setPrescriptions(rx);
      setTestResults(labs);
      setVisionPrescriptions(vision);
      setLocalPrescriptions(localRx);
      setLocalLabResults(localLabs);
      setConditionStatuses(savedConditionStatuses);
    } catch (err: any) {
      console.warn('[VaultProvider] failed to load vault data:', err);
      setError(err?.message || 'Could not load your vault. Pull to refresh to try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated, user?.userId, user?.profileId, user?.email]);

  useEffect(() => {
    if (isAuthenticated) {
      const scopeId = user?.userId || user?.profileId || user?.email;
      setLocalRecordsScope(scopeId);
      load();
    } else {
      clearActiveScope();
      setIsLoading(false);
      setConditions([]);
      setEncounters([]);
      setPrescriptions([]);
      setTestResults([]);
      setVisionPrescriptions([]);
      setLocalPrescriptions([]);
      setLocalLabResults([]);
      setConditionStatuses({});
    }
  }, [isAuthenticated, user?.userId, user?.profileId, user?.email, load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
  }, [load]);

  const refreshLocalPrescriptions = useCallback(async () => {
    setLocalPrescriptions(await getLocalPrescriptions());
  }, []);
  const refreshLocalLabResults = useCallback(async () => {
    setLocalLabResults(await getLocalLabResults());
  }, []);

  const { remoteLabGroups, ungroupedTestResults } = useMemo(() => {
    const { groups, singles } = groupRemoteLabs(testResults, patientContext(user ?? {}));
    return { remoteLabGroups: groups, ungroupedTestResults: singles as LabTestResultResponse[] };
  }, [testResults, user]);

  const addPrescription = useCallback(
    async (draft: LocalPrescriptionDraft) => {
      const issuedAt = draft.dateAdded
        ? (draft.dateAdded.includes('T') ? draft.dateAdded : recordedAtFor(draft.dateAdded))
        : new Date().toISOString();
      const created = await vaultApi.addPrescription({
        medicationName: draft.medicationName,
        dosage: draft.dosage,
        frequency: draft.frequency,
        instructions: draft.instructions,
        issuedAt,
      });
      setPrescriptions((prev) => [created, ...prev]);
      const now = new Date().toISOString();
      return {
        id: created.id!,
        medicationName: created.medicationName ?? draft.medicationName,
        dosage: created.dosage ?? draft.dosage,
        frequency: (created as any).frequency ?? draft.frequency,
        instructions: created.instructions ?? draft.instructions,
        dateAdded: draft.dateAdded,
        status: (created.status as any) ?? 'ACTIVE',
        source: 'PATIENT_LOCAL' as const,
        createdAt: created.issuedAt ?? now,
        updatedAt: created.issuedAt ?? now,
      };
    },
    []
  );

  const editPrescription = useCallback(
    async (id: string, draft: LocalPrescriptionDraft) => {
      if (id.startsWith('local_') || id.startsWith('rx_')) {
        const item = await updateLocalPrescription(id, draft);
        await refreshLocalPrescriptions();
        return item;
      }
      const issuedAt = draft.dateAdded
        ? (draft.dateAdded.includes('T') ? draft.dateAdded : recordedAtFor(draft.dateAdded))
        : undefined;
      const updated = await vaultApi.updatePrescription(id, {
        medicationName: draft.medicationName,
        dosage: draft.dosage,
        frequency: draft.frequency,
        instructions: draft.instructions,
        issuedAt,
      });
      if ((draft as any).status) {
        await vaultApi.updatePrescriptionStatus(id, (draft as any).status);
        updated.status = (draft as any).status;
      }
      setPrescriptions((prev) => prev.map((p) => (p.id === id ? updated : p)));
      const now = new Date().toISOString();
      return {
        id: updated.id!,
        medicationName: updated.medicationName ?? draft.medicationName,
        dosage: updated.dosage ?? draft.dosage,
        frequency: (updated as any).frequency ?? draft.frequency,
        instructions: updated.instructions ?? draft.instructions,
        dateAdded: draft.dateAdded,
        status: (updated.status as any) ?? 'ACTIVE',
        source: 'PATIENT_LOCAL' as const,
        createdAt: updated.issuedAt ?? now,
        updatedAt: now,
      };
    },
    [refreshLocalPrescriptions]
  );

  const removePrescription = useCallback(
    async (id: string) => {
      if (id.startsWith('local_') || id.startsWith('rx_')) {
        await deleteLocalPrescription(id);
        await refreshLocalPrescriptions();
        return;
      }
      await vaultApi.deletePrescription(id);
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    },
    [refreshLocalPrescriptions]
  );

  const setPrescriptionStatus = useCallback(
    async (id: string, isLocal: boolean, status: 'ACTIVE' | 'FULFILLED') => {
      if (isLocal || id.startsWith('local_') || id.startsWith('rx_')) {
        await updateLocalPrescriptionStatus(id, status);
        await refreshLocalPrescriptions();
        return;
      }
      const updated = await vaultApi.updatePrescriptionStatus(id, status);
      setPrescriptions((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [refreshLocalPrescriptions]
  );

  const addLabResult = useCallback(
    async (draft: LocalLabResultDraft) => {
      const recordedAt = draft.dateAdded
        ? (draft.dateAdded.includes('T') ? draft.dateAdded : recordedAtFor(draft.dateAdded))
        : new Date().toISOString();

      const template = draft.panel?.templateCode ? getTemplate(draft.panel.templateCode, draft.panel.templateVersion) : undefined;
      const allF = template ? allFields(template) : [];

      let entries: LabResultValueRequest[] = [];
      if (draft.panel?.entries && draft.panel.entries.length > 0) {
        entries = draft.panel.entries.map((entry) => {
          const field = allF.find((f) => f.key === entry.key);
          const rawVal = entry.value;
          let valueText: string | undefined = undefined;
          let numericValue: number | undefined = undefined;
          let qualifier: '<' | '>' | undefined = undefined;

          if (field?.type === 'text') {
            valueText = String(rawVal ?? '').trim();
          } else if (typeof rawVal === 'string' && rawVal.trim().startsWith('<')) {
            qualifier = '<';
            const num = parseFloat(rawVal.trim().slice(1));
            numericValue = Number.isNaN(num) ? undefined : num;
          } else if (typeof rawVal === 'string' && rawVal.trim().startsWith('>')) {
            qualifier = '>';
            const num = parseFloat(rawVal.trim().slice(1));
            numericValue = Number.isNaN(num) ? undefined : num;
          } else if (entry.qualifier === '<') {
            qualifier = '<';
            numericValue = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
          } else if (entry.qualifier === '>') {
            qualifier = '>';
            numericValue = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
          } else if (typeof rawVal === 'number') {
            numericValue = rawVal;
            qualifier = undefined;
          } else if (typeof rawVal === 'string' && rawVal.trim() !== '') {
            const num = parseFloat(rawVal);
            if (!Number.isNaN(num)) {
              numericValue = num;
              qualifier = undefined;
            } else {
              valueText = rawVal.trim();
            }
          }

          let flag: 'LOW' | 'HIGH' | 'NORMAL' | 'CRITICAL_LOW' | 'CRITICAL_HIGH' | 'ABNORMAL' | null = null;
          if (entry.flag === 'low') flag = 'LOW';
          else if (entry.flag === 'high') flag = 'HIGH';
          else if (entry.flag === 'normal') flag = 'NORMAL';
          else if (entry.flag === 'critical-low') flag = 'CRITICAL_LOW';
          else if (entry.flag === 'critical-high') flag = 'CRITICAL_HIGH';
          else if (entry.flag === 'abnormal') flag = 'ABNORMAL';

          const parsedRef = entry.reference ? parseReference(entry.reference) : undefined;
          const refLow = parsedRef?.min ?? undefined;
          const refHigh = parsedRef?.max ?? undefined;

          return {
            key: entry.key,
            testName: entry.label || field?.label || entry.key,
            numericValue,
            valueText,
            qualifier,
            unit: entry.unit || (field && 'unit' in field ? (field as any).unit : '') || '',
            referenceLow: refLow,
            referenceHigh: refHigh,
            referenceText: entry.reference,
            flag,
          };
        }).filter((e) => e.numericValue != null || (e.valueText && e.valueText.length > 0));
      } else {
        const parsedRef = draft.referenceRange ? parseReference(draft.referenceRange) : undefined;
        entries = [
          {
            testName: draft.testName,
            numericValue: draft.numericValue,
            unit: draft.unit,
            valueText: draft.freeformResult,
            referenceLow: parsedRef?.min,
            referenceHigh: parsedRef?.max,
            referenceText: draft.referenceRange,
          },
        ];
      }

      const created = await vaultApi.addTestResults({
        templateCode: draft.panel?.templateCode,
        templateVersion: draft.panel?.templateVersion,
        panelName: template?.name ?? draft.testName,
        status: 'FINAL',
        recordedAt,
        diagnosticNotes: draft.freeformResult,
        entries,
      });

      setTestResults((prev) => [...created, ...prev]);

      const now = new Date().toISOString();
      return {
        ...draft,
        id: created[0]?.id ?? `lab_${Date.now()}`,
        source: 'PATIENT_LOCAL' as const,
        createdAt: now,
        updatedAt: now,
      };
    },
    []
  );

  const removeLabResult = useCallback(
    async (id: string) => {
      if (id.startsWith('local_') || id.startsWith('lab_')) {
        await deleteLocalLabResult(id);
        await refreshLocalLabResults();
        return;
      }
      const group = remoteLabGroups.find((g) => g.id === id);
      if (group) {
        await Promise.all(group.recordIds.map((rid) => vaultApi.deleteTestResult(rid)));
        setTestResults((prev) => prev.filter((r) => !group.recordIds.includes(r.id!)));
        return;
      }
      await vaultApi.deleteTestResult(id);
      setTestResults((prev) => prev.filter((r) => r.id !== id));
    },
    [refreshLocalLabResults, remoteLabGroups]
  );

  const editLabResult = useCallback(
    async (id: string, draft: LocalLabResultDraft) => {
      if (id.startsWith('local_') || id.startsWith('lab_')) {
        const item = await updateLocalLabResult(id, draft);
        await refreshLocalLabResults();
        return item;
      }
      const item = await addLabResult(draft);
      await removeLabResult(id);
      return item;
    },
    [refreshLocalLabResults, addLabResult, removeLabResult]
  );

  const addCondition = useCallback(async (input: CreateHealthConditionRequest) => {
    const created = await vaultApi.addCondition(input);
    setConditions((prev) => [created, ...prev]);
  }, []);

  const deleteConditionEntry = useCallback(async (id: string) => {
    await vaultApi.deleteCondition(id);
    await deleteLocalConditionStatus(id);
    setConditions((prev) => prev.filter((c) => c.id !== id));
    setConditionStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateConditionStatus = useCallback(async (id: string, status: PatientConditionStatus) => {
    await setLocalConditionStatus(id, status);
    setConditionStatuses((prev) => ({ ...prev, [id]: status }));
  }, []);

  const getLocalPrescriptionById = useCallback(
    (id: string) => localPrescriptions.find((i) => i.id === id),
    [localPrescriptions]
  );
  const getLocalLabResultById = useCallback(
    (id: string) => localLabResults.find((i) => i.id === id),
    [localLabResults]
  );

  // ---- derived, normalized views ----
  const conditionEntries = useMemo(
    () => sortByDateDesc(conditions.map((condition) => conditionToDisplayEntry(
      condition,
      condition.id ? conditionStatuses[condition.id] ?? 'ACTIVE' : 'ACTIVE'
    ))),
    [conditions, conditionStatuses]
  );

  const prescriptionEntries = useMemo(
    () =>
      sortByDateDesc([
        ...prescriptions.map(prescriptionToDisplayEntry),
        ...localPrescriptions.map(localPrescriptionToDisplayEntry),
      ]),
    [prescriptions, localPrescriptions]
  );

  const visionEntries = useMemo(
    () => sortByDateDesc(visionPrescriptions.map(visionToDisplayEntry)),
    [visionPrescriptions]
  );

  const labResultEntries = useMemo(
    () =>
      sortByDateDesc([
        ...remoteLabGroups.map(labGroupToDisplayEntry),
        ...ungroupedTestResults.map(labResultToDisplayEntry),
        ...localLabResults.map(localLabResultToDisplayEntry),
      ]),
    [remoteLabGroups, ungroupedTestResults, localLabResults]
  );

  return (
    <VaultContext.Provider
      value={{
        isLoading,
        isRefreshing,
        error,
        conditions,
        encounters,
        prescriptions,
        testResults,
        visionPrescriptions,
        localPrescriptions,
        localLabResults,
        remoteLabGroups,
        conditionEntries,
        conditionStatuses,
        prescriptionEntries,
        visionEntries,
        labResultEntries,
        refresh,
        getLocalPrescriptionById,
        getLocalLabResultById,
        addPrescription,
        editPrescription,
        removePrescription,
        setPrescriptionStatus,
        addLabResult,
        editLabResult,
        removeLabResult,
        addCondition,
        deleteConditionEntry,
        updateConditionStatus,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return ctx;
}
