/**
 * On-device store for locally-added prescriptions and lab results — the
 * "local bridge" described in LOCAL_BRIDGE_NOTES.md. Lives alongside
 * storage.ts rather than extending it directly: storage.ts wraps
 * expo-secure-store, meant for small secrets (the auth token), not a growing
 * list of records.
 *
 * Native (iOS/Android): expo-file-system's File API (SDK 54+; the older
 * string-based API now lives at `expo-file-system/legacy`).
 * Web: File/Directory aren't available, so this falls back to the same
 * storage.getItem/setItem used elsewhere for web.
 *
 * Multi-user isolation:
 * Storage keys and files are scoped per active user (`user_<userId>`).
 * On first load for a newly-scoped user, any legacy un-scoped data is
 * migrated into the active user's store and cleared from global keys
 * to prevent multi-account data leakage.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

import { storage } from './storage';
import { LOCAL_SOURCE } from '@/types/local-records';
import type {
  LocalLabResult,
  LocalLabResultDraft,
  LocalPrescription,
  LocalPrescriptionDraft,
  PatientConditionStatus,
} from '@/types/local-records';

const isWeb = Platform.OS === 'web';

let activeScope: string = 'global';

export function setLocalRecordsScope(userId?: string | null): void {
  activeScope = userId ? `user_${userId}` : 'global';
}

export function clearActiveScope(): void {
  activeScope = 'global';
}

export function getActiveScope(): string {
  return activeScope;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Scoped key & file builders
const LEGACY_RX_FILE = 'apollo-local-prescriptions.json';
const LEGACY_RX_WEB_KEY = 'apollo_local_prescriptions_v1';
const LEGACY_LAB_FILE = 'apollo-local-lab-results.json';
const LEGACY_LAB_WEB_KEY = 'apollo_local_lab_results_v1';
const LEGACY_CONDITION_STATUS_FILE = 'apollo-condition-statuses.json';
const LEGACY_CONDITION_STATUS_WEB_KEY = 'apollo_condition_statuses_v1';

function getRxFile(scope = activeScope): string {
  return scope === 'global' ? LEGACY_RX_FILE : `apollo-local-prescriptions-${scope}.json`;
}
function getRxWebKey(scope = activeScope): string {
  return scope === 'global' ? LEGACY_RX_WEB_KEY : `apollo_local_prescriptions_${scope}_v1`;
}

function getLabFile(scope = activeScope): string {
  return scope === 'global' ? LEGACY_LAB_FILE : `apollo-local-lab-results-${scope}.json`;
}
function getLabWebKey(scope = activeScope): string {
  return scope === 'global' ? LEGACY_LAB_WEB_KEY : `apollo_local_lab_results_${scope}_v1`;
}

function getConditionStatusFile(scope = activeScope): string {
  return scope === 'global' ? LEGACY_CONDITION_STATUS_FILE : `apollo-condition-statuses-${scope}.json`;
}
function getConditionStatusWebKey(scope = activeScope): string {
  return scope === 'global' ? LEGACY_CONDITION_STATUS_WEB_KEY : `apollo_condition_statuses_${scope}_v1`;
}

async function readCollection<T>(
  fileName: string,
  webKey: string,
  legacyFileName?: string,
  legacyWebKey?: string
): Promise<T[]> {
  try {
    if (isWeb) {
      const raw = await storage.getItem(webKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      // Migrate legacy unscoped data if present
      if (legacyWebKey && webKey !== legacyWebKey) {
        const legacyRaw = await storage.getItem(legacyWebKey);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await storage.setItem(webKey, legacyRaw);
            await storage.removeItem(legacyWebKey);
            return parsed;
          }
        }
      }
      return [];
    }

    const file = new File(Paths.document, fileName);
    if (file.exists) {
      const raw = await file.text();
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }

    // Migrate legacy unscoped file if present
    if (legacyFileName && fileName !== legacyFileName) {
      const legacyFile = new File(Paths.document, legacyFileName);
      if (legacyFile.exists) {
        const legacyRaw = await legacyFile.text();
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (!file.exists) {
              file.create({ intermediates: true });
            }
            file.write(legacyRaw);
            legacyFile.delete();
            return parsed;
          }
        }
      }
    }
    return [];
  } catch (err) {
    console.warn(`[local-records-store] failed to read ${fileName}, starting fresh:`, err);
    return [];
  }
}

async function writeCollection<T>(fileName: string, webKey: string, items: T[]): Promise<void> {
  const json = JSON.stringify(items);
  if (isWeb) {
    await storage.setItem(webKey, json);
    return;
  }
  const file = new File(Paths.document, fileName);
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(json);
}

// ---- prescriptions ----

export async function getLocalPrescriptions(): Promise<LocalPrescription[]> {
  const items = await readCollection<LocalPrescription>(
    getRxFile(),
    getRxWebKey(),
    LEGACY_RX_FILE,
    LEGACY_RX_WEB_KEY
  );
  return [...items].sort((a, b) => (a.dateAdded < b.dateAdded ? 1 : a.dateAdded > b.dateAdded ? -1 : 0));
}

export async function createLocalPrescription(draft: LocalPrescriptionDraft): Promise<LocalPrescription> {
  const now = new Date().toISOString();
  const item: LocalPrescription = {
    ...draft,
    status: 'ACTIVE',
    id: generateId('rx'),
    source: LOCAL_SOURCE,
    createdAt: now,
    updatedAt: now,
  };
  const file = getRxFile();
  const webKey = getRxWebKey();
  const items = await readCollection<LocalPrescription>(file, webKey, LEGACY_RX_FILE, LEGACY_RX_WEB_KEY);
  items.push(item);
  await writeCollection(file, webKey, items);
  return item;
}

export async function updateLocalPrescription(
  id: string,
  draft: LocalPrescriptionDraft
): Promise<LocalPrescription | undefined> {
  const file = getRxFile();
  const webKey = getRxWebKey();
  const items = await readCollection<LocalPrescription>(file, webKey, LEGACY_RX_FILE, LEGACY_RX_WEB_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const updated: LocalPrescription = { ...items[idx], ...draft, id, source: LOCAL_SOURCE, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  await writeCollection(file, webKey, items);
  return updated;
}

export async function updateLocalPrescriptionStatus(
  id: string,
  status: 'ACTIVE' | 'FULFILLED'
): Promise<LocalPrescription | undefined> {
  const file = getRxFile();
  const webKey = getRxWebKey();
  const items = await readCollection<LocalPrescription>(file, webKey, LEGACY_RX_FILE, LEGACY_RX_WEB_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const updated: LocalPrescription = { ...items[idx], status, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  await writeCollection(file, webKey, items);
  return updated;
}

export async function deleteLocalPrescription(id: string): Promise<void> {
  const file = getRxFile();
  const webKey = getRxWebKey();
  const items = await readCollection<LocalPrescription>(file, webKey, LEGACY_RX_FILE, LEGACY_RX_WEB_KEY);
  await writeCollection(file, webKey, items.filter((i) => i.id !== id));
}

// ---- patient condition status (local metadata for doctor and patient records) ----
type StoredConditionStatus = { id: string; status: PatientConditionStatus; updatedAt: string };

export async function getLocalConditionStatuses(): Promise<Record<string, PatientConditionStatus>> {
  const records = await readCollection<StoredConditionStatus>(
    getConditionStatusFile(),
    getConditionStatusWebKey(),
    LEGACY_CONDITION_STATUS_FILE,
    LEGACY_CONDITION_STATUS_WEB_KEY
  );
  const statuses: Record<string, PatientConditionStatus> = {};
  for (const { id, status } of records) statuses[id] = status;
  return statuses;
}

export async function setLocalConditionStatus(id: string, status: PatientConditionStatus): Promise<void> {
  const file = getConditionStatusFile();
  const webKey = getConditionStatusWebKey();
  const records = await readCollection<StoredConditionStatus>(
    file,
    webKey,
    LEGACY_CONDITION_STATUS_FILE,
    LEGACY_CONDITION_STATUS_WEB_KEY
  );
  const next = records.filter((record) => record.id !== id);
  next.push({ id, status, updatedAt: new Date().toISOString() });
  await writeCollection(file, webKey, next);
}

export async function deleteLocalConditionStatus(id: string): Promise<void> {
  const file = getConditionStatusFile();
  const webKey = getConditionStatusWebKey();
  const records = await readCollection<StoredConditionStatus>(
    file,
    webKey,
    LEGACY_CONDITION_STATUS_FILE,
    LEGACY_CONDITION_STATUS_WEB_KEY
  );
  await writeCollection(
    file,
    webKey,
    records.filter((record) => record.id !== id)
  );
}

// ---- lab results ----

export async function getLocalLabResults(): Promise<LocalLabResult[]> {
  const items = await readCollection<LocalLabResult>(
    getLabFile(),
    getLabWebKey(),
    LEGACY_LAB_FILE,
    LEGACY_LAB_WEB_KEY
  );
  return [...items].sort((a, b) => (a.dateAdded < b.dateAdded ? 1 : a.dateAdded > b.dateAdded ? -1 : 0));
}

export async function createLocalLabResult(draft: LocalLabResultDraft): Promise<LocalLabResult> {
  const now = new Date().toISOString();
  const item: LocalLabResult = { ...draft, id: generateId('lab'), source: LOCAL_SOURCE, createdAt: now, updatedAt: now };
  const file = getLabFile();
  const webKey = getLabWebKey();
  const items = await readCollection<LocalLabResult>(file, webKey, LEGACY_LAB_FILE, LEGACY_LAB_WEB_KEY);
  items.push(item);
  await writeCollection(file, webKey, items);
  return item;
}

export async function updateLocalLabResult(
  id: string,
  draft: LocalLabResultDraft
): Promise<LocalLabResult | undefined> {
  const file = getLabFile();
  const webKey = getLabWebKey();
  const items = await readCollection<LocalLabResult>(file, webKey, LEGACY_LAB_FILE, LEGACY_LAB_WEB_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const updated: LocalLabResult = { ...items[idx], ...draft, id, source: LOCAL_SOURCE, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  await writeCollection(file, webKey, items);
  return updated;
}

export async function deleteLocalLabResult(id: string): Promise<void> {
  const file = getLabFile();
  const webKey = getLabWebKey();
  const items = await readCollection<LocalLabResult>(file, webKey, LEGACY_LAB_FILE, LEGACY_LAB_WEB_KEY);
  await writeCollection(file, webKey, items.filter((i) => i.id !== id));
}

export async function clearLocalRecords(scope = activeScope): Promise<void> {
  const rxFile = getRxFile(scope);
  const rxKey = getRxWebKey(scope);
  const labFile = getLabFile(scope);
  const labKey = getLabWebKey(scope);
  const condFile = getConditionStatusFile(scope);
  const condKey = getConditionStatusWebKey(scope);

  if (isWeb) {
    await storage.removeItem(rxKey);
    await storage.removeItem(labKey);
    await storage.removeItem(condKey);
    return;
  }
  const f1 = new File(Paths.document, rxFile);
  if (f1.exists) f1.delete();
  const f2 = new File(Paths.document, labFile);
  if (f2.exists) f2.delete();
  const f3 = new File(Paths.document, condFile);
  if (f3.exists) f3.delete();
}
