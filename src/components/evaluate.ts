import type {
  DraftValues,
  Flag,
  LabTemplate,
  NumberField,
  PatientContext,
  ReferenceRange,
  ResultEntry,
  TemplateField,
} from './types';

/** Lab staff type "5,4" or "5.4": accept both. */
export function parseDecimal(input: string): number | undefined {
  const s = input.trim().replace(',', '.');
  return /^-?(\d+(\.\d*)?|\.\d+)$/.test(s) ? Number(s) : undefined;
}

/** 5 → "5.0" when decimals is 1. Only pads, never rounds. */
export function padDecimals(n: number, decimals = 0): string {
  const s = String(n);
  if (/e/i.test(s)) return s;
  const [int = '', frac = ''] = s.split('.');
  return decimals > frac.length ? `${int}.${frac.padEnd(decimals, '0')}` : s;
}

/** The range that applies to this patient. Most specific wins: sex + age, then either one, then everyone. */
export function pickRange(field: NumberField, patient: PatientContext): ReferenceRange | undefined {
  const applies = (r: ReferenceRange) =>
    (r.sex === undefined || r.sex === patient.sex) &&
    (r.ageMin === undefined || (patient.ageYears !== undefined && patient.ageYears >= r.ageMin)) &&
    (r.ageMax === undefined || (patient.ageYears !== undefined && patient.ageYears <= r.ageMax));
  const specificity = (r: ReferenceRange) =>
    (r.sex !== undefined ? 1 : 0) + (r.ageMin !== undefined || r.ageMax !== undefined ? 1 : 0);

  return field.ranges.filter(applies).sort((a, b) => specificity(b) - specificity(a))[0];
}

/** "130–175", "≤ 5.2" or "≥ 1.0". */
export function formatRange(r: ReferenceRange | undefined, decimals = 0): string {
  if (!r) return '';
  const n = (v: number) => padDecimals(v, decimals);
  if (r.min !== undefined && r.max !== undefined) return `${n(r.min)}–${n(r.max)}`;
  if (r.min !== undefined) return `≥ ${n(r.min)}`;
  if (r.max !== undefined) return `≤ ${n(r.max)}`;
  return '';
}

export function flagFor(value: number, r: ReferenceRange | undefined): Flag | undefined {
  if (!r) return undefined;
  if (r.criticalLow !== undefined && value < r.criticalLow) return 'critical-low';
  if (r.criticalHigh !== undefined && value > r.criticalHigh) return 'critical-high';
  if (r.min !== undefined && value < r.min) return 'low';
  if (r.max !== undefined && value > r.max) return 'high';
  return 'normal';
}

export const isCritical = (flag?: Flag) => flag === 'critical-low' || flag === 'critical-high';

export const allFields = (template: LabTemplate): TemplateField[] =>
  template.sections.flatMap((section) => section.fields);

export interface EvalOptions {
  /** true = an empty required field is an error. Use it when finalizing, not for drafts. */
  requireComplete?: boolean;
}

export interface FieldEvaluation {
  flag?: Flag;
  /** Set when the input can't be accepted. */
  error?: string;
  /** Set when the field holds a usable value. */
  entry?: ResultEntry;
}

export function evaluateField(
  field: TemplateField,
  raw: string | undefined,
  patient: PatientContext,
  { requireComplete = false }: EvalOptions = {},
): FieldEvaluation {
  const text = (raw ?? '').trim();
  if (text === '') return field.required && requireComplete ? { error: 'Required' } : {};

  switch (field.type) {
    case 'number': {
      const value = parseDecimal(text);
      if (value === undefined) return { error: 'Enter a number, e.g. 5.4' };

      const { plausible } = field;
      if (plausible && (value < plausible.min || value > plausible.max)) {
        return { error: `Unlikely value. Expected ${plausible.min}–${plausible.max} ${field.unit}`.trim() };
      }

      const range = pickRange(field, patient);
      const flag = flagFor(value, range);
      const reference = formatRange(range, field.decimals) || undefined;
      return {
        flag,
        entry: { key: field.key, value, unit: field.unit || undefined, flag, reference },
      };
    }
    case 'choice': {
      const option = field.options.find((o) => o.value === text);
      if (!option) return { error: 'Pick one of the options' };
      const flag: Flag = option.abnormal ? 'abnormal' : 'normal';
      return { flag, entry: { key: field.key, value: option.value, flag } };
    }
    case 'text':
      return { entry: { key: field.key, value: text } };
  }
}

export interface TemplateEvaluation {
  /** Every field that holds a usable value. This is what you save. */
  entries: ResultEntry[];
  /** Per-field outcome, for live flags and error messages. */
  byKey: Record<string, FieldEvaluation>;
  /** field key → message. Empty means the result can be saved. */
  errors: Record<string, string>;
}

export function evaluateTemplate(
  template: LabTemplate,
  values: DraftValues,
  patient: PatientContext,
  options?: EvalOptions,
): TemplateEvaluation {
  const entries: ResultEntry[] = [];
  const byKey: Record<string, FieldEvaluation> = {};
  const errors: Record<string, string> = {};

  for (const field of allFields(template)) {
    const result = evaluateField(field, values[field.key], patient, options);
    byKey[field.key] = result;
    if (result.entry) entries.push(result.entry);
    if (result.error) errors[field.key] = result.error;
  }
  return { entries, byKey, errors };
}

/** How a saved entry reads in a report. */
export function formatValue(field: TemplateField, entry: ResultEntry): string {
  if (field.type === 'choice') {
    return field.options.find((o) => o.value === entry.value)?.label ?? String(entry.value);
  }
  if (field.type === 'number' && typeof entry.value === 'number') {
    return padDecimals(entry.value, field.decimals);
  }
  return String(entry.value);
}
