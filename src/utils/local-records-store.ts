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

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function readCollection<T>(fileName: string, webKey: string): Promise<T[]> {
  try {
    if (isWeb) {
      const raw = await storage.getItem(webKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    const file = new File(Paths.document, fileName);
    if (!file.exists) return [];
    const raw = await file.text();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
const RX_FILE = 'apollo-local-prescriptions.json';
const RX_WEB_KEY = 'apollo_local_prescriptions_v1';

export async function getLocalPrescriptions(): Promise<LocalPrescription[]> {
  const items = await readCollection<LocalPrescription>(RX_FILE, RX_WEB_KEY);
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
  const items = await readCollection<LocalPrescription>(RX_FILE, RX_WEB_KEY);
  items.push(item);
  await writeCollection(RX_FILE, RX_WEB_KEY, items);
  return item;
}

export async function updateLocalPrescription(
  id: string,
  draft: LocalPrescriptionDraft
): Promise<LocalPrescription | undefined> {
  const items = await readCollection<LocalPrescription>(RX_FILE, RX_WEB_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const updated: LocalPrescription = { ...items[idx], ...draft, id, source: LOCAL_SOURCE, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  await writeCollection(RX_FILE, RX_WEB_KEY, items);
  return updated;
}

export async function updateLocalPrescriptionStatus(
  id: string,
  status: 'ACTIVE' | 'FULFILLED'
): Promise<LocalPrescription | undefined> {
  const items = await readCollection<LocalPrescription>(RX_FILE, RX_WEB_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const updated: LocalPrescription = { ...items[idx], status, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  await writeCollection(RX_FILE, RX_WEB_KEY, items);
  return updated;
}

export async function deleteLocalPrescription(id: string): Promise<void> {
  const items = await readCollection<LocalPrescription>(RX_FILE, RX_WEB_KEY);
  await writeCollection(RX_FILE, RX_WEB_KEY, items.filter((i) => i.id !== id));
}

// ---- patient condition status (local metadata for doctor and patient records) ----
const CONDITION_STATUS_FILE = 'apollo-condition-statuses.json';
const CONDITION_STATUS_WEB_KEY = 'apollo_condition_statuses_v1';
type StoredConditionStatus = { id: string; status: PatientConditionStatus; updatedAt: string };

export async function getLocalConditionStatuses(): Promise<Record<string, PatientConditionStatus>> {
  const records = await readCollection<StoredConditionStatus>(CONDITION_STATUS_FILE, CONDITION_STATUS_WEB_KEY);
  const statuses: Record<string, PatientConditionStatus> = {};
  for (const { id, status } of records) statuses[id] = status;
  return statuses;
}

export async function setLocalConditionStatus(id: string, status: PatientConditionStatus): Promise<void> {
  const records = await readCollection<StoredConditionStatus>(CONDITION_STATUS_FILE, CONDITION_STATUS_WEB_KEY);
  const next = records.filter((record) => record.id !== id);
  next.push({ id, status, updatedAt: new Date().toISOString() });
  await writeCollection(CONDITION_STATUS_FILE, CONDITION_STATUS_WEB_KEY, next);
}

export async function deleteLocalConditionStatus(id: string): Promise<void> {
  const records = await readCollection<StoredConditionStatus>(CONDITION_STATUS_FILE, CONDITION_STATUS_WEB_KEY);
  await writeCollection(
    CONDITION_STATUS_FILE,
    CONDITION_STATUS_WEB_KEY,
    records.filter((record) => record.id !== id)
  );
}

// ---- lab results ----
const LAB_FILE = 'apollo-local-lab-results.json';
const LAB_WEB_KEY = 'apollo_local_lab_results_v1';

export async function getLocalLabResults(): Promise<LocalLabResult[]> {
  const items = await readCollection<LocalLabResult>(LAB_FILE, LAB_WEB_KEY);
  return [...items].sort((a, b) => (a.dateAdded < b.dateAdded ? 1 : a.dateAdded > b.dateAdded ? -1 : 0));
}

export async function createLocalLabResult(draft: LocalLabResultDraft): Promise<LocalLabResult> {
  const now = new Date().toISOString();
  const item: LocalLabResult = { ...draft, id: generateId('lab'), source: LOCAL_SOURCE, createdAt: now, updatedAt: now };
  const items = await readCollection<LocalLabResult>(LAB_FILE, LAB_WEB_KEY);
  items.push(item);
  await writeCollection(LAB_FILE, LAB_WEB_KEY, items);
  return item;
}

export async function updateLocalLabResult(
  id: string,
  draft: LocalLabResultDraft
): Promise<LocalLabResult | undefined> {
  const items = await readCollection<LocalLabResult>(LAB_FILE, LAB_WEB_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const updated: LocalLabResult = { ...items[idx], ...draft, id, source: LOCAL_SOURCE, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  await writeCollection(LAB_FILE, LAB_WEB_KEY, items);
  return updated;
}

export async function deleteLocalLabResult(id: string): Promise<void> {
  const items = await readCollection<LocalLabResult>(LAB_FILE, LAB_WEB_KEY);
  await writeCollection(LAB_FILE, LAB_WEB_KEY, items.filter((i) => i.id !== id));
}
