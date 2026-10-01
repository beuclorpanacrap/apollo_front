/**
 * Patient-authored local records — prescriptions and lab results the patient
 * adds directly, each fully independent (no shared "visit" wrapper). The
 * backend has no patient-write path for either yet (only
 * `POST /api/v1/patient/vault/conditions` exists), so these persist on-device
 * via `src/utils/local-records-store.ts` until that catches up — see
 * LOCAL_BRIDGE_NOTES.md at the repo root.
 *
 * Field names mirror `PrescriptionResponse` / `LabTestResultResponse` (see
 * src/api/types.ts) wherever the concepts line up.
 */

export const LOCAL_SOURCE: 'PATIENT_LOCAL' = 'PATIENT_LOCAL';
export type LocalSourceType = typeof LOCAL_SOURCE;

/** Patient's personal lifecycle marker for condition records. */
export type PatientConditionStatus = 'ACTIVE' | 'RESOLVED';

/** Mirrors PrescriptionResponse's medicationName/dosage/instructions;
 *  `frequency` is an extra field the backend schema doesn't have yet. */
export interface LocalPrescription {
  id: string;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  dateAdded: string; // ISO yyyy-mm-dd
  status?: 'ACTIVE' | 'FULFILLED';
  source: LocalSourceType;
  createdAt: string;
  updatedAt: string;
}

export type LocalPrescriptionDraft = {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  dateAdded: string;
};

/** Mirrors LabTestResultResponse's testName/numericValue/unit for the
 *  structured case; `referenceRange` and freeform mode are local extensions. */
export interface LocalLabResult {
  id: string;
  mode: 'structured' | 'freeform';
  testName: string;
  numericValue?: number;
  unit?: string;
  referenceRange?: string;
  freeformResult?: string;
  dateAdded: string;
  source: LocalSourceType;
  createdAt: string;
  updatedAt: string;
}

export type LocalLabResultDraft = {
  mode: 'structured' | 'freeform';
  testName: string;
  numericValue?: number;
  unit?: string;
  referenceRange?: string;
  freeformResult?: string;
  dateAdded: string;
};
