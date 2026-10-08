import type { components } from '@/api/types';

type Schemas = components['schemas'];
export type Encounter = Schemas['ClinicalEncounterSummaryDto'];
export type Prescription = Schemas['PrescriptionResponse'];
export type LabResult = Schemas['LabTestResultResponse'];
export type Condition = Schemas['HealthConditionResponse'];
export type PatientSummary = Schemas['PatientProfileSummaryDto'];

// ---------------------------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------------------------

export const DOCTOR_ROLE_LABELS = {
  GENERAL_PRACTITIONER: 'General practitioner',
  SPECIALIST: 'Specialist',
  LAB_TECHNICIAN: 'Lab technician',
  PHARMACIST: 'Pharmacist',
} as const;
export type DoctorRole = keyof typeof DOCTOR_ROLE_LABELS;

export function isDoctorRole(value: unknown): value is DoctorRole {
  return typeof value === 'string' && value in DOCTOR_ROLE_LABELS;
}

/** Mirrors the existing `canLab` rule: pharmacists cannot record lab results. */
export function canRecordLabs(role: unknown): boolean {
  return role === 'GENERAL_PRACTITIONER' || role === 'SPECIALIST' || role === 'LAB_TECHNICIAN';
}

/** One line per role describing what it can do (derived from the existing permission behavior). */
export const DOCTOR_ROLE_CAPABILITIES: Record<DoctorRole, string> = {
  GENERAL_PRACTITIONER: 'Can add encounters, prescriptions and lab results.',
  SPECIALIST: 'Can add encounters, prescriptions and lab results.',
  LAB_TECHNICIAN: 'Can add encounters, prescriptions and lab results.',
  PHARMACIST: 'Can add encounters and prescriptions. Cannot add lab results.',
};

// ---------------------------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------------------------

/** `NON_BINARY` → `Non binary`. Never shows a raw enum. */
export function sentenceCase(value: string): string {
  const spaced = value.trim().replace(/[_\s]+/g, ' ').toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : '';
}

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

export function formatGender(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  return GENDER_LABELS[value.trim().toUpperCase()] ?? sentenceCase(value);
}

export function formatBloodType(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export function initialsOf(name?: string | null, fallback = '?'): string {
  const parts = (name ?? '').split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  const picked = parts.length === 1 ? [parts[0]] : [parts[0], parts[parts.length - 1]];
  return picked.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function fullName(patient?: PatientSummary | null, fallback = 'Patient'): string {
  return [patient?.firstName, patient?.lastName].filter(Boolean).join(' ').trim() || fallback;
}

// ---------------------------------------------------------------------------------------------
// Dates (date-only strings are local calendar dates: `new Date('YYYY-MM-DD')` is UTC and shows the
// previous day in negative offsets)
// ---------------------------------------------------------------------------------------------

export function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const parsed = new Date(dateOnly ? `${trimmed}T00:00:00` : trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value?: string | null, fallback = 'Not recorded'): string {
  const parsed = parseDateInput(value);
  return parsed ? parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : fallback;
}

/** One time formatter for the whole portal so 12h/24h is consistent with the person's locale. */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(value?: string | null, fallback = 'Not recorded'): string {
  const parsed = parseDateInput(value);
  if (!parsed) return fallback;
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  return dateOnly ? formatDate(value, fallback) : `${formatDate(value, fallback)}, ${formatClock(parsed)}`;
}

/** Short month + day only, for dense lists and chart labels. */
export function formatShortDate(value?: string | null, fallback = '—'): string {
  const parsed = parseDateInput(value);
  return parsed ? parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : fallback;
}

export function monthLabel(value?: string | null): string {
  const parsed = parseDateInput(value);
  return parsed ? parsed.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Undated';
}

/** Whole years, or months for infants. `null` for missing, invalid or future dates. */
export function formatAge(dob?: string | null, now: Date = new Date()): string | null {
  const birth = parseDateInput(dob);
  if (!birth || birth.getTime() > now.getTime()) return null;
  let years = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) years -= 1;
  if (years < 0 || years > 130) return null;
  if (years >= 2) return `${years} years`;
  let months = years * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months <= 0) return 'Under 1 month';
  return months === 1 ? '1 month' : `${months} months`;
}

// ---------------------------------------------------------------------------------------------
// Record ordering
// ---------------------------------------------------------------------------------------------

type Dated = {
  id?: string;
  encounterDate?: string;
  recordedAt?: string;
  dateRecorded?: string;
  issuedAt?: string;
  createdAt?: string;
};

/** Best available date: encounterDate → recordedAt → dateRecorded → issuedAt → createdAt. */
export function bestDate(record: Dated): string | undefined {
  return record.encounterDate || record.recordedAt || record.dateRecorded || record.issuedAt || record.createdAt || undefined;
}

export function timeOf(value?: string | null): number {
  const parsed = parseDateInput(value);
  return parsed ? parsed.getTime() : 0;
}

/** Newest first, deterministic: best date, then createdAt, then id. */
export function compareNewestFirst(a: Dated, b: Dated): number {
  const byDate = timeOf(bestDate(b)) - timeOf(bestDate(a));
  if (byDate !== 0) return byDate;
  const byCreated = timeOf(b.createdAt) - timeOf(a.createdAt);
  if (byCreated !== 0) return byCreated;
  return (b.id ?? '').localeCompare(a.id ?? '');
}

export function sortNewestFirst<T extends Dated>(items: readonly T[] | undefined): T[] {
  return [...(items ?? [])].sort(compareNewestFirst);
}

// ---------------------------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------------------------

export function isPrescriptionExpired(rx: Prescription, now: Date = new Date()): boolean {
  const expires = parseDateInput(rx.expiresAt);
  return !!expires && expires.getTime() < now.getTime();
}

// ---------------------------------------------------------------------------------------------
// Lab results
// ---------------------------------------------------------------------------------------------

export interface LabGroup {
  key: string;
  name: string;
  /** Shared unit, or `null` when results disagree (we never plot or compare across units). */
  unit: string | null;
  mixedUnits: boolean;
  /** Oldest → newest (chart order). */
  results: LabResult[];
  latest: LabResult;
}

const labKey = (name?: string) => (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function groupLabResults(results: readonly LabResult[] | undefined): LabGroup[] {
  const buckets = new Map<string, LabResult[]>();
  for (const result of results ?? []) {
    const key = labKey(result.testName) || 'untitled';
    buckets.set(key, [...(buckets.get(key) ?? []), result]);
  }
  const groups: LabGroup[] = [];
  for (const [key, items] of buckets) {
    const ascending = [...items].sort((a, b) => -compareNewestFirst(a, b));
    const latest = ascending[ascending.length - 1];
    const units = new Set(ascending.map((item) => (item.unit ?? '').trim()));
    const mixedUnits = units.size > 1;
    groups.push({
      key,
      name: latest.testName?.trim() || 'Lab result',
      unit: mixedUnits ? null : [...units][0] || null,
      mixedUnits,
      results: ascending,
      latest,
    });
  }
  return groups.sort((a, b) => compareNewestFirst(a.latest, b.latest));
}

/** Locale-aware number without float noise (95.50000001 → 95.5). */
export function formatNumber(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/** "3 results, latest 95.5 mg/dL on Mar 10, 2024" — the text alternative for a sparkline. */
export function labTrendSummary(group: LabGroup): string {
  const count = group.results.length;
  const latest = group.latest;
  const value = `${formatNumber(latest.numericValue)}${latest.unit ? ` ${latest.unit}` : ''}`;
  return `${count} ${count === 1 ? 'result' : 'results'}, latest ${value} on ${formatDate(bestDate(latest))}`;
}

/** Accepts "95,5" as well as "95.5". Returns `null` when it isn't a finite number. */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------------------------
// Session countdown
// ---------------------------------------------------------------------------------------------

export const MINUTE = 60_000;

/** "23 h 41 min" while there is time; "4:32" in the final five minutes. */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  if (ms > 5 * MINUTE) {
    const totalMinutes = Math.ceil(ms / MINUTE);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  }
  const totalSeconds = Math.ceil(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/** Spoken form for the live region. */
export function spokenRemaining(ms: number): string {
  if (ms <= 0) return 'expired';
  if (ms > 5 * MINUTE) {
    const totalMinutes = Math.ceil(ms / MINUTE);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    return parts.join(' ');
  }
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return [minutes ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : '', seconds ? `${seconds} seconds` : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * The only moments announced to assistive tech: 10 min, 5 min, 1 min and expiry.
 * Returns `null` outside those windows so the live region stays quiet between ticks.
 */
export function countdownAnnouncement(ms: number): string | null {
  if (ms <= 0) return 'Patient vault access has expired.';
  if (ms <= MINUTE) return 'Patient vault access expires in under 1 minute.';
  if (ms <= 5 * MINUTE) return 'Patient vault access expires in under 5 minutes.';
  if (ms <= 10 * MINUTE) return 'Patient vault access expires in under 10 minutes.';
  return null;
}

/** "Expires today at 14:32" / "Expires tomorrow at 09:10" / "Expires Mon, 12 Oct at 14:32". */
export function formatExpiry(expiresAt: Date, now: Date = new Date()): string {
  const time = formatClock(expiresAt);
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(expiresAt) - startOfDay(now)) / 86_400_000);
  if (diffDays === 0) return `Expires today at ${time}`;
  if (diffDays === 1) return `Expires tomorrow at ${time}`;
  return `Expires ${expiresAt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} at ${time}`;
}

// ---------------------------------------------------------------------------------------------
// Form helpers (add-record dialog)
// ---------------------------------------------------------------------------------------------

/** `yyyy-mm-dd` for the local calendar day (what `<input type="date">` expects). */
export function toDateInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `yyyy-mm-ddThh:mm` for `<input type="datetime-local">`. */
export function toDateTimeInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `new Date('').toISOString()` throws a RangeError; this returns `null` instead. */
export function toIsoOrNull(local: string): string | null {
  if (!local.trim()) return null;
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
