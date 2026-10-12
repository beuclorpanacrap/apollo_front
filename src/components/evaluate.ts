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

/** Where the form keeps the reference range the lab printed next to a value. */
export const printedReferenceKey = (fieldKey: string) => `${fieldKey}:reference`;

/** Where the form keeps the test name and unit typed for a 'measurement' field. */
export const measurementNameKey = (fieldKey: string) => `${fieldKey}:name`;
export const measurementUnitKey = (fieldKey: string) => `${fieldKey}:unit`;

/** "5.4" → {value: 5.4}; "<0.5" → {value: 0.5, qualifier: '<'} (only when the field allows it). */
export function parseResult(
  input: string,
  censored = false,
): { value: number; qualifier?: '<' | '>' } | undefined {
  const text = input.trim();
  const bound = censored ? /^([<>])\s*(.+)$/.exec(text) : null;
  if (bound) {
    const value = parseDecimal(bound[2]!);
    return value === undefined ? undefined : { value, qualifier: bound[1] as '<' | '>' };
  }
  const value = parseDecimal(text);
  return value === undefined ? undefined : { value };
}

const REF_NUMBER = '(-?\\d+(?:[.,]\\d+)?)';
const refNumber = (s: string) => Number(s.replace(',', '.'));

/** "130–175", "70-100", "≤ 5.2" and "≥ 1.0" → a range. Anything else → undefined. */
export function parseReference(text?: string): Pick<ReferenceRange, 'min' | 'max'> | undefined {
  if (!text) return undefined;
  const between = new RegExp(`^\\s*${REF_NUMBER}\\s*[–-]\\s*${REF_NUMBER}\\s*$`).exec(text);
  if (between) return { min: refNumber(between[1]!), max: refNumber(between[2]!) };
  const atMost = new RegExp(`^\\s*(?:≤|<=?)\\s*${REF_NUMBER}\\s*$`).exec(text);
  if (atMost) return { max: refNumber(atMost[1]!) };
  const atLeast = new RegExp(`^\\s*(?:≥|>=?)\\s*${REF_NUMBER}\\s*$`).exec(text);
  if (atLeast) return { min: refNumber(atLeast[1]!) };
  return undefined;
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

/**
 * `qualifier` means the true value is below ('<') or above ('>') `value`. A flag is only
 * given when every value that fits would get the same one; otherwise there is none.
 */
export function flagFor(
  value: number,
  r: ReferenceRange | undefined,
  qualifier?: '<' | '>',
): Flag | undefined {
  if (!r) return undefined;
  if (qualifier === '<') {
    if (r.criticalLow !== undefined && value <= r.criticalLow) return 'critical-low';
    if (r.min !== undefined) return value <= r.min ? 'low' : undefined;
    return r.max !== undefined && value > r.max ? undefined : 'normal';
  }
  if (qualifier === '>') {
    if (r.criticalHigh !== undefined && value >= r.criticalHigh) return 'critical-high';
    if (r.max !== undefined) return value >= r.max ? 'high' : undefined;
    return r.min !== undefined && value < r.min ? undefined : 'normal';
  }
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
  /** The reference range as the lab printed it, e.g. "3.5–12.5". Wins over the template's range. */
  printedReference?: string;
  /** Only for 'measurement' fields: the test name and unit the person typed. */
  name?: string;
  unit?: string;
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
  { requireComplete = false, printedReference, name, unit }: EvalOptions = {},
): FieldEvaluation {
  const text = (raw ?? '').trim();
  if (text === '') return field.required && requireComplete ? { error: 'Required' } : {};

  switch (field.type) {
    case 'number': {
      const parsed = parseResult(text, field.censored);
      if (parsed === undefined) {
        return { error: field.censored ? 'Enter a number, e.g. 5.4 or <0.5' : 'Enter a number, e.g. 5.4' };
      }
      const { value, qualifier } = parsed;

      const { plausible } = field;
      if (plausible && (value < plausible.min || value > plausible.max)) {
        return { error: `Unlikely value. Expected ${plausible.min}–${plausible.max} ${field.unit}`.trim() };
      }

      let range: ReferenceRange | undefined;
      const printed = (printedReference ?? '').trim();
      if (printed) {
        range = parseReference(printed);
        if (!range) return { error: 'Reference: use a form like 3.5–12.5, ≤ 5 or ≥ 1' };
      } else {
        range = pickRange(field, patient);
      }
      const flag = flagFor(value, range, qualifier);
      const reference = formatRange(range, field.decimals) || undefined;
      return {
        flag,
        entry: {
          key: field.key,
          value,
          ...(qualifier ? { qualifier } : {}),
          unit: field.unit || undefined,
          flag,
          reference,
        },
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
    case 'measurement': {
      const label = (name ?? '').trim();
      if (!label) return { error: 'Enter the test name' };

      // Anything that isn't a number ("Positive", "1:80") is kept as written, without a flag.
      const parsed = parseResult(text, true);
      if (parsed === undefined) return { entry: { key: field.key, label, value: text } };

      let range: ReferenceRange | undefined;
      const printed = (printedReference ?? '').trim();
      if (printed) {
        range = parseReference(printed);
        if (!range) return { error: 'Reference: use a form like 3.5–12.5, ≤ 5 or ≥ 1' };
      }
      const flag = flagFor(parsed.value, range, parsed.qualifier);
      const typedUnit = (unit ?? '').trim();
      return {
        flag,
        entry: {
          key: field.key,
          label,
          value: parsed.value,
          ...(parsed.qualifier ? { qualifier: parsed.qualifier } : {}),
          unit: typedUnit || undefined,
          flag,
          reference: formatRange(range) || undefined,
        },
      };
    }
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
    const result = evaluateField(field, values[field.key], patient, {
      ...options,
      printedReference: values[printedReferenceKey(field.key)],
      name: values[measurementNameKey(field.key)],
      unit: values[measurementUnitKey(field.key)],
    });
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
    return `${entry.qualifier ?? ''}${padDecimals(entry.value, field.decimals)}`;
  }
  if (field.type === 'measurement' && typeof entry.value === 'number') {
    return `${entry.qualifier ?? ''}${entry.value}`;
  }
  return String(entry.value);
}
