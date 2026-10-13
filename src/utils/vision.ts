/**
 * Glasses prescriptions: formatting, validation and request building.
 *
 * Pure TypeScript with relative imports only, so it runs under Jest as-is.
 *
 * Conventions used here (the usual optical ones):
 *  - OD = right eye (oculus dexter), OS = left eye (oculus sinister).
 *  - Sphere / cylinder / add are diopters (D) in quarter-diopter steps; the axis is whole degrees 0–180.
 *  - Powers are always written with their sign (+0.50, -2.25); a sphere of 0 reads "Plano".
 */

import type { CreateVisionPrescriptionRequest, VisionEyeValues, VisionPrescriptionResponse } from '../api/vision.types';
import { parseDateInput, parseDecimal } from './clinician-format';

export type VisionEye = 'right' | 'left';
export type VisionPart = 'sphere' | 'cylinder' | 'axis' | 'add';

export const VISION_EYES: readonly { key: VisionEye; label: string; abbr: 'OD' | 'OS' }[] = [
  { key: 'right', label: 'Right eye', abbr: 'OD' },
  { key: 'left', label: 'Left eye', abbr: 'OS' },
];

export const VISION_PARTS: readonly VisionPart[] = ['sphere', 'cylinder', 'axis', 'add'];

/** Typo guards, not clinical limits: anything outside is rejected as "unlikely". */
export const VISION_LIMITS = {
  sphere: { min: -20, max: 20 },
  cylinder: { min: -8, max: 8 },
  add: { min: 0.25, max: 4 },
  axis: { min: 0, max: 180 },
  pd: { min: 35, max: 90 },
  step: 0.25,
} as const;

export type VisionFormValues = Record<string, string>;
export type VisionFormErrors = Record<string, string>;

/** Form field name for one eye's value, e.g. `fieldName('right', 'sphere')` → `rightSphere`. */
export function fieldName(eye: VisionEye, part: VisionPart): string {
  return `${eye}${part.charAt(0).toUpperCase()}${part.slice(1)}`;
}

/** Every field a doctor sees, in the order focus should land on an invalid one. */
export const VISION_FIELD_ORDER: readonly string[] = [
  ...VISION_EYES.flatMap((eye) => VISION_PARTS.map((part) => fieldName(eye.key, part))),
  'pd',
  'expiresAt',
  'notes',
];

export function emptyVisionValues(): VisionFormValues {
  return Object.fromEntries(VISION_FIELD_ORDER.map((name) => [name, ''])) as VisionFormValues;
}

// ---------------------------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------------------------

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** +0.50, -2.25, 0.00. Always two decimals and an explicit sign. */
export function formatPower(value?: number | null): string {
  if (!isNumber(value)) return '—';
  const fixed = Math.abs(value).toFixed(2);
  if (value > 0) return `+${fixed}`;
  if (value < 0) return `-${fixed}`;
  return '0.00';
}

/** Like `formatPower`, but 0 reads "Plano". */
export function formatSphere(value?: number | null): string {
  return value === 0 ? 'Plano' : formatPower(value);
}

export function formatAxis(value?: number | null): string {
  return isNumber(value) ? `${value}°` : '—';
}

export function formatPupillaryDistance(value?: number | null): string {
  return isNumber(value) ? `${Number(value.toFixed(1))} mm` : '—';
}

/** True when the eye carries any correction at all. */
export function hasCorrection(eye?: VisionEyeValues | null): boolean {
  return !!eye && (isNumber(eye.sphere) || isNumber(eye.cylinder) || isNumber(eye.add));
}

/** "-2.50 / -0.75 × 180°", "Plano", or "" when the eye has no correction. Add is shown separately. */
export function formatEyeCorrection(eye?: VisionEyeValues | null): string {
  if (!eye || !hasCorrection(eye)) return '';
  const parts: string[] = [];
  if (isNumber(eye.sphere)) parts.push(formatSphere(eye.sphere));
  if (isNumber(eye.cylinder) && eye.cylinder !== 0) {
    parts.push(`${formatPower(eye.cylinder)}${isNumber(eye.axis) ? ` × ${eye.axis}°` : ''}`);
  }
  return parts.join(' / ');
}

/** "OD -2.50 / -0.75 × 180° · OS -1.75 · Add +1.50": one line for lists and the timeline. */
export function summarizeVision(rx: Pick<VisionPrescriptionResponse, 'rightEye' | 'leftEye'>): string {
  const eyes = VISION_EYES.flatMap((eye) => {
    const values = eye.key === 'right' ? rx.rightEye : rx.leftEye;
    const text = formatEyeCorrection(values);
    return text ? [`${eye.abbr} ${text}`] : [];
  });
  const right = rx.rightEye?.add;
  const left = rx.leftEye?.add;
  const add = isNumber(right) && isNumber(left) && right !== left
    ? `Add OD ${formatPower(right)}, OS ${formatPower(left)}`
    : isNumber(right) || isNumber(left)
      ? `Add ${formatPower(isNumber(right) ? right : left)}`
      : '';
  return [...eyes, add].filter(Boolean).join(' · ');
}

/** A date typed as yyyy-mm-dd is valid through that whole local day. */
export function endOfLocalDay(date: string): Date {
  return new Date(`${date.trim()}T23:59:00`);
}

/** True when the prescription has an expiry that has passed. A missing expiry never expires. */
export function isVisionExpired(rx: Pick<VisionPrescriptionResponse, 'expiresAt'>, now: Date = new Date()): boolean {
  const expires = parseDateInput(rx.expiresAt);
  return !!expires && expires.getTime() < now.getTime();
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

const onQuarterStep = (n: number) => Math.abs(n / VISION_LIMITS.step - Math.round(n / VISION_LIMITS.step)) < 1e-9;
const signed = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

/** Parses a typed value. `''` → `undefined` (left empty), unparseable → `null`. Comma decimals and a leading + are fine. */
function parseField(text: string | undefined): number | null | undefined {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return undefined;
  return parseDecimal(trimmed);
}

function checkPower(
  errors: VisionFormErrors,
  name: string,
  label: string,
  raw: string | undefined,
  limits: { min: number; max: number },
): void {
  const value = parseField(raw);
  if (value === undefined) return;
  if (value === null) errors[name] = `Enter ${label} as a number, for example -2.50.`;
  else if (value < limits.min || value > limits.max) {
    errors[name] = `${label[0]!.toUpperCase()}${label.slice(1)} should be between ${signed(limits.min)} and ${signed(limits.max)}.`;
  } else if (!onQuarterStep(value)) errors[name] = 'Use steps of 0.25.';
}

/** Field name → message. Empty object means the form can be saved. */
export function validateVisionForm(values: VisionFormValues): VisionFormErrors {
  const errors: VisionFormErrors = {};
  let anyEye = false;

  for (const eye of VISION_EYES) {
    const get = (part: VisionPart) => values[fieldName(eye.key, part)];
    const filled = VISION_PARTS.some((part) => (get(part) ?? '').trim() !== '');
    if (!filled) continue;
    anyEye = true;

    const sphere = parseField(get('sphere'));
    const cylinder = parseField(get('cylinder'));
    const axis = parseField(get('axis'));

    if (sphere === undefined) errors[fieldName(eye.key, 'sphere')] = 'Enter the sphere, or 0 for plano.';
    else checkPower(errors, fieldName(eye.key, 'sphere'), 'the sphere', get('sphere'), VISION_LIMITS.sphere);

    checkPower(errors, fieldName(eye.key, 'cylinder'), 'the cylinder', get('cylinder'), VISION_LIMITS.cylinder);
    checkPower(errors, fieldName(eye.key, 'add'), 'the add', get('add'), VISION_LIMITS.add);

    const cylinderName = fieldName(eye.key, 'cylinder');
    const axisName = fieldName(eye.key, 'axis');
    const hasCylinder = typeof cylinder === 'number' && cylinder !== 0;
    if (axis === null) errors[axisName] = 'Enter the axis as a whole number of degrees.';
    else if (typeof axis === 'number') {
      if (!Number.isInteger(axis) || axis < VISION_LIMITS.axis.min || axis > VISION_LIMITS.axis.max) {
        errors[axisName] = 'The axis is a whole number from 0 to 180.';
      } else if (!hasCylinder && !errors[cylinderName]) {
        errors[axisName] = 'The axis only applies together with a cylinder.';
      }
    } else if (hasCylinder && !errors[cylinderName]) {
      errors[axisName] = 'Enter the axis for this cylinder.';
    }
  }

  if (!anyEye) errors[fieldName('right', 'sphere')] = 'Enter the prescription for at least one eye.';

  const pd = parseField(values.pd);
  if (pd === null) errors.pd = 'Enter the pupillary distance in millimetres, for example 63.';
  else if (typeof pd === 'number' && (pd < VISION_LIMITS.pd.min || pd > VISION_LIMITS.pd.max)) {
    errors.pd = `The pupillary distance should be between ${VISION_LIMITS.pd.min} and ${VISION_LIMITS.pd.max} mm.`;
  }

  const expires = (values.expiresAt ?? '').trim();
  if (expires && Number.isNaN(endOfLocalDay(expires).getTime())) errors.expiresAt = 'Enter a valid date.';

  return errors;
}

// ---------------------------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------------------------

function eyeFromValues(values: VisionFormValues, eye: VisionEye): VisionEyeValues {
  const read = (part: VisionPart) => {
    const value = parseField(values[fieldName(eye, part)]);
    // `-0` would serialise as 0 but print as "-0.00" in some paths; normalise it.
    return typeof value === 'number' ? (value === 0 ? 0 : value) : undefined;
  };
  const sphere = read('sphere');
  const cylinder = read('cylinder');
  const axis = read('axis');
  const add = read('add');
  const out: VisionEyeValues = {};
  if (sphere !== undefined) out.sphere = sphere;
  // A zero cylinder means "no astigmatism correction"; it (and any stray axis) is not sent.
  if (cylinder !== undefined && cylinder !== 0) {
    out.cylinder = cylinder;
    if (axis !== undefined) out.axis = axis;
  }
  if (add !== undefined) out.add = add;
  return out;
}

/** Builds the POST body. Call only for a form `validateVisionForm` accepted. */
export function buildVisionRequest(
  patientId: string,
  values: VisionFormValues,
  options: { encounterId?: string } = {},
): CreateVisionPrescriptionRequest {
  const body: CreateVisionPrescriptionRequest = {
    patientId,
    rightEye: eyeFromValues(values, 'right'),
    leftEye: eyeFromValues(values, 'left'),
  };
  if (options.encounterId) body.encounterId = options.encounterId;
  const pd = parseField(values.pd);
  if (typeof pd === 'number') body.pupillaryDistanceMm = pd;
  const notes = (values.notes ?? '').trim();
  if (notes) body.notes = notes;
  const expires = (values.expiresAt ?? '').trim();
  if (expires) {
    const parsed = endOfLocalDay(expires);
    if (!Number.isNaN(parsed.getTime())) body.expiresAt = parsed.toISOString();
  }
  return body;
}
