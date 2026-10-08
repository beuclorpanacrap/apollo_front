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

import { activeVault, clearActiveVault, setActiveVault, type UnlockedVault } from '@/api/doctor.api';
import { useAuth } from '@/context/auth-context';
import type { Condition, Encounter, LabResult, Prescription } from '@/utils/clinician-format';

export type RecordKind = 'encounter' | 'prescription' | 'lab';
type RecordFor<K extends RecordKind> = K extends 'encounter' ? Encounter : K extends 'prescription' ? Prescription : LabResult;

type ClinicianVaultValue = {
  /** The unlocked vault, or `null` when locked / expired. Always a fresh object after any change. */
  vault: UnlockedVault | null;
  /** Make a freshly unlocked vault current (called after `doctorApi.unlock` resolves). */
  open: (next: UnlockedVault) => void;
  /** Lock: clears the module-level vault and resets state (Close vault, role update, sign-out, 401). */
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
  const current = activeVault;
  if (current?.sessionExpiresAt && Date.parse(current.sessionExpiresAt) <= Date.now()) {
    clearActiveVault();
    return null;
  }
  return current;
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
  const [recentIds, setRecentIds] = useState<ReadonlySet<string>>(() => new Set());
  const [expired, setExpired] = useState(false);
  const highlightTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const close = useCallback(() => {
    clearActiveVault();
    setVault(null);
    setRecentIds(new Set());
  }, []);

  const open = useCallback((next: UnlockedVault) => {
    setVault(next);
    setRecentIds(new Set());
    setExpired(false);
  }, []);

  const addRecord = useCallback(<K extends RecordKind>(kind: K, record: RecordFor<K>) => {
    setVault((current) => {
      if (!current) return current;
      return kind === 'lab'
        ? { ...current, testResults: [...(current.testResults ?? []), record as LabResult] }
        : kind === 'prescription'
          ? { ...current, prescriptions: [...(current.prescriptions ?? []), record as Prescription] }
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
  const expiresAt = vault?.sessionExpiresAt;
  useEffect(() => {
    if (!expiresAt || typeof document === 'undefined') return;
    const lapse = () => {
      close();
      setExpired(true);
    };
    const check = () => {
      if (Date.parse(expiresAt) <= Date.now()) lapse();
    };
    const msLeft = Date.parse(expiresAt) - Date.now();
    // setTimeout delays above 2^31-1 ms overflow; sessions are 24h so this is only a guard.
    const timeout = setTimeout(check, Math.min(Math.max(0, msLeft), 2_000_000_000));
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [expiresAt, close]);

  useEffect(() => {
    const timers = highlightTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo<ClinicianVaultValue>(
    () => ({ vault, open, close, addRecord, recentIds, expired, acknowledgeExpiry }),
    [vault, open, close, addRecord, recentIds, expired, acknowledgeExpiry],
  );

  return <ClinicianVaultContext.Provider value={value}>{children}</ClinicianVaultContext.Provider>;
}

export function useClinicianVault(): ClinicianVaultValue {
  const value = useContext(ClinicianVaultContext);
  if (!value) throw new Error('useClinicianVault must be used inside <ClinicianVaultProvider>.');
  return value;
}

export type { Condition };
