import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { HealthConditionResponse, LabTestResultResponse, PrescriptionResponse } from '@/api/vault.api';
import { BrandColors, Colors } from '@/constants/theme';
import type { LocalLabResult, LocalPrescription, PatientConditionStatus } from '@/types/local-records';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ColorTheme = { [K in keyof typeof Colors.light]: string };

export type VaultEntryKind = 'CONDITION' | 'PRESCRIPTION' | 'LAB_RESULT';
export type VaultEntrySource = 'PATIENT_DECLARED' | 'DOCTOR_VERIFIED' | 'CLINICIAN_ENTERED' | 'PATIENT_LOCAL';

export interface VaultDisplayEntry {
  id: string;
  kind: VaultEntryKind;
  title: string;
  subtitle?: string;
  dateLabel: string;
  /** Raw sortable date string (yyyy-mm-dd or ISO datetime); newest first. */
  sortKey: string;
  source: VaultEntrySource;
  isLocal: boolean;
  /** Only entries backed by a local record can be edited or deleted — always
   *  decide that from this, not from `source`, since a backend field can
   *  drift from its documented enum. */
  isEditable: boolean;
  /** Every entry is viewable — tapping a card always opens its View screen,
   *  whether it's yours or your doctor's. Edit/Delete live inside that
   *  screen, gated on isEditable. */
  viewHref: { pathname: string; params: { id: string } };
  /** Raw condition type enum (e.g. "ALLERGY") — only set for CONDITION entries, used for color/icon selection since `subtitle` holds the human-formatted label. */
  conditionType?: string;
  /** Lifecycle state for prescription entries. */
  prescriptionStatus?: 'ACTIVE' | 'FULFILLED' | 'CANCELLED';
  /** Patient's personal status; stored locally because the API has no lifecycle field for conditions. */
  conditionStatus?: PatientConditionStatus;
}

// ---- formatting -------------------------------------------------------

export function formatDateLabel(iso?: string): string {
  if (!iso) return 'Undated';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function sourceLabel(source: VaultEntrySource): string {
  switch (source) {
    case 'DOCTOR_VERIFIED':
      return 'Doctor verified';
    case 'CLINICIAN_ENTERED':
      return 'Clinician entered';
    case 'PATIENT_LOCAL':
      return 'Logged by you';
    case 'PATIENT_DECLARED':
    default:
      return 'Self-reported';
  }
}

export function sourceBadgeColors(source: VaultEntrySource, theme: ColorTheme): { bg: string; fg: string } {
  switch (source) {
    case 'DOCTOR_VERIFIED':
    case 'CLINICIAN_ENTERED':
      return { bg: theme.pillGreenBg, fg: theme.pillGreenText };
    case 'PATIENT_LOCAL':
      return { bg: theme.pillPeachBg, fg: theme.pillPeachText };
    case 'PATIENT_DECLARED':
    default:
      return { bg: theme.surfaceMuted, fg: theme.textSecondary };
  }
}

export function sourceIcon(source: VaultEntrySource): IconName {
  switch (source) {
    case 'DOCTOR_VERIFIED':
    case 'CLINICIAN_ENTERED':
      return 'shield-checkmark';
    case 'PATIENT_LOCAL':
      return 'person';
    default:
      return 'person-outline';
  }
}

/** A condition is only ever protected from deletion when the backend
 *  explicitly marks it doctor/clinician-authored — everything else
 *  (including an unexpected or missing sourceType) defaults to deletable,
 *  since that's the safer default for a patient's own health data. */
export function isConditionDeletable(source: VaultEntrySource): boolean {
  return source !== 'DOCTOR_VERIFIED' && source !== 'CLINICIAN_ENTERED';
}

/** Condition sub-types each get their own color so allergy/chronic/lifestyle
 *  are visually distinct at a glance, not just differently-worded. */
function conditionAccent(conditionType?: string): string {
  switch (conditionType) {
    case 'ALLERGY':
      return BrandColors.coral;
    case 'LIFESTYLE':
      return BrandColors.honey;
    case 'CHRONIC_CONDITION':
    default:
      return BrandColors.plum;
  }
}

function conditionPillColors(conditionType: string | undefined, theme: ColorTheme): { bg: string; fg: string } {
  switch (conditionType) {
    case 'ALLERGY':
      return { bg: theme.pillCoralBg, fg: theme.pillCoralText };
    case 'LIFESTYLE':
      return { bg: theme.pillHoneyBg, fg: theme.pillHoneyText };
    case 'CHRONIC_CONDITION':
    default:
      return { bg: theme.pillPlumBg, fg: theme.pillPlumText };
  }
}

export function accentForKind(kind: VaultEntryKind, theme: ColorTheme, conditionType?: string): string {
  switch (kind) {
    case 'PRESCRIPTION':
      return BrandColors.marigold;
    case 'LAB_RESULT':
      return BrandColors.clay;
    case 'CONDITION':
    default:
      return conditionAccent(conditionType);
  }
}

/** Soft bg + matching text color per entry — used for icon bubbles so they
 *  stay theme-correct instead of computing translucent hex from the accent. */
export function pillColorsForKind(
  kind: VaultEntryKind,
  theme: ColorTheme,
  conditionType?: string
): { bg: string; fg: string } {
  switch (kind) {
    case 'PRESCRIPTION':
      return { bg: theme.pillMarigoldBg, fg: theme.pillMarigoldText };
    case 'LAB_RESULT':
      return { bg: theme.pillClayBg, fg: theme.pillClayText };
    case 'CONDITION':
    default:
      return conditionPillColors(conditionType, theme);
  }
}

export function iconForKind(kind: VaultEntryKind, conditionType?: string): IconName {
  if (kind === 'CONDITION') {
    if (conditionType === 'ALLERGY') return 'warning';
    if (conditionType === 'LIFESTYLE') return 'walk';
    if (conditionType === 'SURGERY') return 'cut';
    if (conditionType === 'MEDICATION') return 'medkit';
    return 'pulse';
  }
  if (kind === 'PRESCRIPTION') return 'medical';
  return 'flask';
}

export function formatConditionType(type?: string): string {
  if (!type) return 'Condition';
  const map: Record<string, string> = {
    ALLERGY: 'Allergy',
    CHRONIC_CONDITION: 'Chronic condition',
    LIFESTYLE: 'Lifestyle',
    PAST_HISTORY: 'Past history',
    MEDICATION: 'Medication',
    SURGERY: 'Surgery',
    OTHER: 'Other',
  };
  return map[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}

// ---- mappers: backend/local record -> VaultDisplayEntry ---------------

export function conditionToDisplayEntry(
  c: HealthConditionResponse,
  conditionStatus: PatientConditionStatus = 'ACTIVE'
): VaultDisplayEntry {
  const source = (c.sourceType as VaultEntrySource) ?? 'PATIENT_DECLARED';
  const id = c.id ?? `condition-${c.title}-${c.dateRecorded ?? ''}`;
  return {
    id,
    kind: 'CONDITION',
    title: c.title ?? 'Condition',
    subtitle: formatConditionType(c.type),
    conditionType: c.type,
    dateLabel: formatDateLabel(c.dateRecorded ?? c.createdAt),
    sortKey: c.dateRecorded ?? c.createdAt ?? '',
    source,
    isLocal: false,
    isEditable: isConditionDeletable(source),
    conditionStatus,
    viewHref: { pathname: '/vault/view-condition', params: { id } },
  };
}

export function prescriptionToDisplayEntry(p: PrescriptionResponse): VaultDisplayEntry {
  const id = p.id ?? `rx-${p.medicationName ?? ''}-${p.issuedAt ?? ''}`;
  return {
    id,
    kind: 'PRESCRIPTION',
    title: p.medicationName ?? 'Prescription',
    subtitle: [p.dosage, p.instructions].filter(Boolean).join(' · ') || undefined,
    dateLabel: formatDateLabel(p.issuedAt),
    sortKey: p.issuedAt ?? '',
    source: 'DOCTOR_VERIFIED',
    isLocal: false,
    isEditable: false,
    prescriptionStatus: p.status ?? 'ACTIVE',
    viewHref: { pathname: '/vault/view-prescription', params: { id } },
  };
}

export function labResultToDisplayEntry(r: LabTestResultResponse): VaultDisplayEntry {
  const id = r.id ?? `lab-${r.testName ?? ''}-${r.recordedAt ?? ''}`;
  return {
    id,
    kind: 'LAB_RESULT',
    title: r.testName ?? 'Lab result',
    subtitle:
      [r.numericValue != null ? `${r.numericValue} ${r.unit ?? ''}`.trim() : undefined, r.doctorName]
        .filter(Boolean)
        .join(' · ') || undefined,
    dateLabel: formatDateLabel(r.recordedAt),
    sortKey: r.recordedAt ?? '',
    source: 'DOCTOR_VERIFIED',
    isLocal: false,
    isEditable: false,
    viewHref: { pathname: '/vault/view-lab-result', params: { id } },
  };
}

export function localPrescriptionToDisplayEntry(rx: LocalPrescription): VaultDisplayEntry {
  return {
    id: rx.id,
    kind: 'PRESCRIPTION',
    title: rx.medicationName,
    subtitle: [rx.dosage, rx.frequency].filter(Boolean).join(' · ') || undefined,
    dateLabel: formatDateLabel(rx.dateAdded),
    sortKey: rx.dateAdded,
    source: 'PATIENT_LOCAL',
    isLocal: true,
    isEditable: true,
    prescriptionStatus: rx.status ?? 'ACTIVE',
    viewHref: { pathname: '/vault/view-prescription', params: { id: rx.id } },
  };
}

export function localLabResultToDisplayEntry(lab: LocalLabResult): VaultDisplayEntry {
  const valueText =
    lab.mode === 'structured'
      ? [
          lab.numericValue != null ? `${lab.numericValue} ${lab.unit ?? ''}`.trim() : undefined,
          lab.referenceRange ? `ref ${lab.referenceRange}` : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
      : lab.freeformResult;
  return {
    id: lab.id,
    kind: 'LAB_RESULT',
    title: lab.testName,
    subtitle: valueText || undefined,
    dateLabel: formatDateLabel(lab.dateAdded),
    sortKey: lab.dateAdded,
    source: 'PATIENT_LOCAL',
    isLocal: true,
    isEditable: true,
    viewHref: { pathname: '/vault/view-lab-result', params: { id: lab.id } },
  };
}

export function sortByDateDesc(entries: VaultDisplayEntry[]): VaultDisplayEntry[] {
  return [...entries].sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
}
