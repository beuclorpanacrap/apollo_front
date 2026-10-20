import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { activeVault, clearActiveVault, getUnlockedVaults, isVaultValid, removeUnlockedVault, setActiveVault, type UnlockedVault } from '@/api/doctor.api';
import { useAuth } from '@/context/auth-context';
import type { Condition, Encounter, LabResult, Prescription, VisionPrescription } from '@/utils/clinician-format';

export type RecordKind = 'encounter' | 'prescription' | 'lab' | 'vision';
type RecordFor<K extends RecordKind> = K extends 'encounter'
  ? Encounter
  : K extends 'prescription'
    ? Prescription
    : K extends 'vision'
      ? VisionPrescription
      : LabResult;

type ClinicianVaultValue = {
  /** The unlocked vault, or `null` when locked / expired. Always a fresh object after any change. */
  vault: UnlockedVault | null;
  vaults: UnlockedVault[];
  select: (next: UnlockedVault | null) => void;
  closeCurrent: () => void;
  /** Make a freshly unlocked vault current (called after `doctorApi.unlock` resolves). */
  open: (next: UnlockedVault) => void;
  /** Clear every patient session after a role update, sign-out, or account change. */
  close: () => void;
  /** Immutable append. Writes the new vault back so Dashboard → Profile → Dashboard keeps the record. */
  addRecord: <K extends RecordKind>(kind: K, record: RecordFor<K>) => void;
  /** Ids of records added in this session (drives the "just added" highlight; never persisted). */
  recentIds: ReadonlySet<string>;
  /** Set when the session lapsed while the portal was open; cleared by `acknowledgeExpiry`. */
  expired: boolean;
  acknowledgeExpiry: () => void;
};

const ClinicianVaultContext = createContext<ClinicianVaultValue | null>(null);

/** Initial state: today's behavior — reuse the module-level vault unless its session has already lapsed. */
function readInitial(): UnlockedVault | null {
  getUnlockedVaults();
  return activeVault;
}

const HIGHLIGHT_MS = 6000;

/**
 * Owns the unlocked vault for the whole clinician portal. Health records and PINs live only in memory
 * (React state + the module-level `activeVault`); nothing here touches localStorage, sessionStorage
 * or IndexedDB.
 */
export function ClinicianVaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [vault, setVault] = useState<UnlockedVault | null>(readInitial);
  const [vaults, setVaults] = useState(() => [...getUnlockedVaults()]);
  const [recentIds, setRecentIds] = useState<ReadonlySet<string>>(() => new Set());
  const [expired, setExpired] = useState(false);
  const highlightTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const close = useCallback(() => {
    clearActiveVault();
    setVault(null);
    setVaults([]);
    setRecentIds(new Set());
  }, []);

  const open = useCallback((next: UnlockedVault) => {
    if (!isVaultValid(next)) return;
    setActiveVault(next);
    setVaults([...getUnlockedVaults()]);
    setVault(next);
    setRecentIds(new Set());
    setExpired(false);
  }, []);

  const select = useCallback((next: UnlockedVault | null) => {
    if (next && !isVaultValid(next)) return;
    setActiveVault(next);
    setVault(next);
    setRecentIds(new Set());
    setExpired(false);
  }, []);

  const closeCurrent = useCallback(() => {
    if (vault) removeUnlockedVault(vault);
    setVaults([...getUnlockedVaults()]);
    select(null);
  }, [vault, select]);

  const addRecord = useCallback(<K extends RecordKind>(kind: K, record: RecordFor<K>) => {
    setVault((current) => {
      if (!current) return current;
      return kind === 'lab'
        ? { ...current, testResults: [...(current.testResults ?? []), record as LabResult] }
        : kind === 'prescription'
          ? { ...current, prescriptions: [...(current.prescriptions ?? []), record as Prescription] }
          : kind === 'vision'
            ? { ...current, visionPrescriptions: [...(current.visionPrescriptions ?? []), record as VisionPrescription] }
            : { ...current, encounterHistory: [...(current.encounterHistory ?? []), record as Encounter] };
    });
    const id = (record as { id?: string }).id;
    if (id) {
      setRecentIds((current) => new Set(current).add(id));
      const timer = setTimeout(() => {
        highlightTimers.current.delete(timer);
        setRecentIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, HIGHLIGHT_MS);
      highlightTimers.current.add(timer);
    }
  }, []);

  const acknowledgeExpiry = useCallback(() => setExpired(false), []);

  // Mirror state into the module-level vault so it survives Dashboard → Profile → Dashboard remounts.
  useEffect(() => {
    setActiveVault(vault);
    setVaults([...getUnlockedVaults()]);
  }, [vault]);

  // Never let PHI outlive the person who unlocked it: sign-out (or a different account) drops the vault.
  const userId = user?.userId;
  const lastUserId = useRef(userId);
  useEffect(() => {
    if (lastUserId.current !== userId) {
      lastUserId.current = userId;
      close();
    }
  }, [userId, close]);

  // Expiry: a timeout for the exact moment, plus a re-check when the tab wakes (timers are throttled
  // or paused while a laptop sleeps or a tab is in the background).
  useEffect(() => {
    if (!vaults.length) return;
    const check = () => {
      const remaining = getUnlockedVaults();
      if (remaining.length !== vaults.length) setVaults([...remaining]);
      if (vault && !isVaultValid(vault)) {
        setVault(null);
        setRecentIds(new Set());
        setExpired(true);
      }
    };
    const nextExpiry = Math.min(...vaults.map(item => Date.parse(item.sessionExpiresAt!)));
    const timeout = setTimeout(check, Math.min(Math.max(0, nextExpiry - Date.now()), 2_000_000_000));
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', check);
    if (typeof window !== 'undefined') window.addEventListener('focus', check);
    return () => {
      clearTimeout(timeout);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', check);
      if (typeof window !== 'undefined') window.removeEventListener('focus', check);
    };
  }, [vaults, vault]);

  useEffect(() => {
    const timers = highlightTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo<ClinicianVaultValue>(
    () => ({ vault, vaults, select, closeCurrent, open, close, addRecord, recentIds, expired, acknowledgeExpiry }),
    [vault, vaults, select, closeCurrent, open, close, addRecord, recentIds, expired, acknowledgeExpiry],
  );

  return <ClinicianVaultContext.Provider value={value}>{children}</ClinicianVaultContext.Provider>;
}

export function useClinicianVault(): ClinicianVaultValue {
  const value = useContext(ClinicianVaultContext);
  if (!value) throw new Error('useClinicianVault must be used inside <ClinicianVaultProvider>.');
  return value;
}

export type { Condition };
