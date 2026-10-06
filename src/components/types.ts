/**
 * Lab result templates: data model.
 *
 * A template describes one test (sections, fields, units, reference ranges).
 * A result is what a lab doctor entered for one patient, saved as ResultEntry[].
 *
 * types.ts, evaluate.ts and templates.ts never import React Native, so a
 * TypeScript backend can reuse them to validate a result before saving it.
 */

export type Sex = 'female' | 'male';

/**
 * What we know about the patient, used to pick the right reference range.
 * Leave a field out when it is unknown: ranges that depend on it are then skipped.
 */
export interface PatientContext {
  sex?: Sex;
  /** Completed years. */
  ageYears?: number;
}

/**
 * One reference interval. Bounds are inclusive; leave one out for "at most" / "at least".
 * `sex`, `ageMin` and `ageMax` narrow who the range applies to (leave out = everyone).
 */
export interface ReferenceRange {
  min?: number;
  max?: number;
  /** Beyond these the value is critical and the ordering doctor has to be told. */
  criticalLow?: number;
  criticalHigh?: number;
  sex?: Sex;
  ageMin?: number;
  ageMax?: number;
}

export interface FieldBase {
  /** Stable key saved with every result. Never rename it once results exist. */
  key: string;
  label: string;
  required?: boolean;
}

export interface NumberField extends FieldBase {
  type: 'number';
  /** Use '' for unitless values such as pH. */
  unit: string;
  /** Decimals shown in reference ranges; values are padded to this many (5 → "5.0"). Nothing is rounded. */
  decimals?: number;
  ranges: ReferenceRange[];
  /** Typo guard, not a clinical limit: anything outside is rejected as "unlikely". */
  plausible?: { min: number; max: number };
}

export interface ChoiceOption {
  value: string;
  label: string;
  /** Selecting this option flags the result as abnormal. */
  abnormal?: boolean;
}

export interface ChoiceField extends FieldBase {
  type: 'choice';
  options: ChoiceOption[];
}

export interface TextField extends FieldBase {
  type: 'text';
  multiline?: boolean;
}

export type TemplateField = NumberField | ChoiceField | TextField;

export interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}

export interface LabTemplate {
  /** Stable id, e.g. "cbc". */
  code: string;
  /** Bump when fields or ranges change. Saved results keep the version they were entered with. */
  version: number;
  name: string;
  specimen: string;
  sections: TemplateSection[];
}

/** What the form holds while typing: field key → raw text (or the chosen option's value). */
export type DraftValues = Record<string, string>;

export type Flag = 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' | 'abnormal';

/**
 * One saved value. It carries its own flag and reference text, so an old result
 * never changes when a template is edited later (same idea as a FHIR Observation).
 */
export interface ResultEntry {
  key: string;
  value: number | string;
  unit?: string;
  flag?: Flag;
  /** Reference text as printed on the report, e.g. "130–175". */
  reference?: string;
}

export type ResultStatus = 'draft' | 'final';

/** The body you send to the backend (add patient id and lab doctor id there). */
export interface LabResultPayload {
  /** Date the test was taken, yyyy-mm-dd. */
  takenOn: string;
  templateCode: string;
  templateVersion: number;
  status: ResultStatus;
  entries: ResultEntry[];
}
