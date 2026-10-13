/**
 * Vision (glasses) prescriptions: the contract this app expects from the backend.
 *
 * Hand-written on purpose. `types.ts` is generated from the backend's OpenAPI spec and the backend
 * doesn't have this record yet. Once it does, regenerate `types.ts` and replace these with
 * `components['schemas'][...]`. The field names below are the proposal; see LOCAL_BRIDGE_NOTES.md.
 *
 * Pure types (no runtime imports) so utils and tests can use them under Jest as-is.
 */

/** One eye's correction. Powers are in diopters (D), the axis in degrees. */
export interface VisionEyeValues {
  /** Spherical power, e.g. -2.5. `0` means plano (no spherical correction). */
  sphere?: number;
  /** Astigmatism correction. Omitted (or 0) when the eye has none. */
  cylinder?: number;
  /** Cylinder axis, whole degrees 0–180. Only meaningful together with a non-zero `cylinder`. */
  axis?: number;
  /** Near addition (always positive), for reading and multifocal lenses. */
  add?: number;
}

/** POST /api/v1/doctor/vision-prescriptions */
export interface CreateVisionPrescriptionRequest {
  /** Patient profile UUID. */
  patientId: string;
  /** Optional clinical encounter UUID if issued during a consultation. */
  encounterId?: string;
  /** OD (oculus dexter). */
  rightEye: VisionEyeValues;
  /** OS (oculus sinister). */
  leftEye: VisionEyeValues;
  /** Distance between the pupils, in millimetres. */
  pupillaryDistanceMm?: number;
  notes?: string;
  /** ISO date-time until which the prescription is valid. */
  expiresAt?: string;
}

/**
 * Returned by the POST above, by GET /api/v1/patient/vault/vision-prescriptions, and carried as
 * `visionPrescriptions` on the unlocked doctor vault.
 */
export interface VisionPrescriptionResponse {
  id?: string;
  patientId?: string;
  doctorId?: string;
  doctorName?: string;
  encounterId?: string;
  rightEye?: VisionEyeValues;
  leftEye?: VisionEyeValues;
  pupillaryDistanceMm?: number;
  notes?: string;
  /** ISO date-time. */
  issuedAt?: string;
  /** ISO date-time. */
  expiresAt?: string;
}
