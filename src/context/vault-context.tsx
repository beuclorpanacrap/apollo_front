import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  vaultApi,
  type ClinicalEncounterSummaryDto,
  type CreateHealthConditionRequest,
  type HealthConditionResponse,
  type LabTestResultResponse,
  type PrescriptionResponse,
} from '@/api/vault.api';
import { useAuth } from '@/context/auth-context';
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
} from '@/utils/local-records-store';
import {
  conditionToDisplayEntry,
  labResultToDisplayEntry,
  localLabResultToDisplayEntry,
  localPrescriptionToDisplayEntry,
  prescriptionToDisplayEntry,
  sortByDateDesc,
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
  localPrescriptions: LocalPrescription[];
  localLabResults: LocalLabResult[];

  // Normalized, merged views for rendering.
  conditionEntries: VaultDisplayEntry[];
  conditionStatuses: Record<string, PatientConditionStatus>;
  prescriptionEntries: VaultDisplayEntry[]; // doctor rx + local rx
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
  const { isAuthenticated } = useAuth();

  const [conditions, setConditions] = useState<HealthConditionResponse[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounterSummaryDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [testResults, setTestResults] = useState<LabTestResultResponse[]>([]);
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
      const [timeline, rx, labs, localRx, localLabs, savedConditionStatuses] = await Promise.all([
        vaultApi.getTimeline(),
        vaultApi.getPrescriptions().catch(() => [] as PrescriptionResponse[]),
        vaultApi.getTestResults().catch(() => [] as LabTestResultResponse[]),
        getLocalPrescriptions(),
        getLocalLabResults(),
        getLocalConditionStatuses(),
      ]);
      setConditions(timeline.conditions ?? []);
      setEncounters(timeline.encounters ?? []);
      setPrescriptions(rx);
      setTestResults(labs);
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      load();
    } else {
      setIsLoading(false);
      setConditions([]);
      setEncounters([]);
      setPrescriptions([]);
      setTestResults([]);
      setLocalPrescriptions([]);
      setLocalLabResults([]);
      setConditionStatuses({});
    }
  }, [isAuthenticated, load]);

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

  const addPrescription = useCallback(
    async (draft: LocalPrescriptionDraft) => {
      const item = await createLocalPrescription(draft);
      await refreshLocalPrescriptions();
      return item;
    },
    [refreshLocalPrescriptions]
  );
  const editPrescription = useCallback(
    async (id: string, draft: LocalPrescriptionDraft) => {
      const item = await updateLocalPrescription(id, draft);
      await refreshLocalPrescriptions();
      return item;
    },
    [refreshLocalPrescriptions]
  );
  const removePrescription = useCallback(
    async (id: string) => {
      await deleteLocalPrescription(id);
      await refreshLocalPrescriptions();
    },
    [refreshLocalPrescriptions]
  );
  const setPrescriptionStatus = useCallback(
    async (id: string, isLocal: boolean, status: 'ACTIVE' | 'FULFILLED') => {
      if (isLocal) {
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
      const item = await createLocalLabResult(draft);
      await refreshLocalLabResults();
      return item;
    },
    [refreshLocalLabResults]
  );
  const editLabResult = useCallback(
    async (id: string, draft: LocalLabResultDraft) => {
      const item = await updateLocalLabResult(id, draft);
      await refreshLocalLabResults();
      return item;
    },
    [refreshLocalLabResults]
  );
  const removeLabResult = useCallback(
    async (id: string) => {
      await deleteLocalLabResult(id);
      await refreshLocalLabResults();
    },
    [refreshLocalLabResults]
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

  const labResultEntries = useMemo(
    () =>
      sortByDateDesc([
        ...testResults.map(labResultToDisplayEntry),
        ...localLabResults.map(localLabResultToDisplayEntry),
      ]),
    [testResults, localLabResults]
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
        localPrescriptions,
        localLabResults,
        conditionEntries,
        conditionStatuses,
        prescriptionEntries,
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
