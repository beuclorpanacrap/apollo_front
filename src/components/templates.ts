import type { ChoiceField, ChoiceOption, LabTemplate, NumberField, TemplateSection } from './types';

/*
 * HOW TO ADD A TEST
 * Take one result sheet and copy its structure:
 *   - each block on the sheet        → a section
 *   - a row with unit + reference    → a 'number' field (one `ranges` entry per sex / age band)
 *   - a row like Negative / + / ++   → a 'choice' field (mark the abnormal options)
 *   - anything else (remarks)        → a 'text' field
 * Give every field a short, stable `key` and never rename it once results exist.
 * When you change a template later, bump `version` and keep the old one in TEMPLATES.
 *
 * ⚠️ The reference ranges below are typical adult values so the demo behaves realistically.
 * Real ranges depend on the lab's analyzer and method.
 */

const commentSection: TemplateSection = {
  id: 'comment',
  title: 'Lab comment',
  fields: [{ key: 'comment', label: 'Comment', type: 'text', multiline: true }],
};

const percent = (key: string, label: string, min: number, max: number): NumberField => ({
  key,
  label,
  type: 'number',
  unit: '%',
  plausible: { min: 0, max: 100 },
  ranges: [{ min, max }],
});

// ─── Complete blood count ────────────────────────────────────────────────────

export const cbc: LabTemplate = {
  code: 'cbc',
  version: 1,
  name: 'Complete blood count',
  specimen: 'Whole blood (EDTA)',
  sections: [
    {
      id: 'red-cells',
      title: 'Red cells',
      fields: [
        {
          key: 'hgb',
          label: 'Hemoglobin',
          type: 'number',
          unit: 'g/L',
          required: true,
          plausible: { min: 20, max: 250 },
          ranges: [
            { sex: 'male', min: 130, max: 175, criticalLow: 70, criticalHigh: 200 },
            { sex: 'female', min: 120, max: 155, criticalLow: 70, criticalHigh: 200 },
          ],
        },
        {
          key: 'rbc',
          label: 'Red blood cells',
          type: 'number',
          unit: '×10¹²/L',
          decimals: 1,
          required: true,
          plausible: { min: 1, max: 9 },
          ranges: [
            { sex: 'male', min: 4.5, max: 5.9 },
            { sex: 'female', min: 4.1, max: 5.1 },
          ],
        },
        {
          key: 'hct',
          label: 'Hematocrit',
          type: 'number',
          unit: '%',
          plausible: { min: 5, max: 75 },
          ranges: [
            { sex: 'male', min: 41, max: 53 },
            { sex: 'female', min: 36, max: 46 },
          ],
        },
        { key: 'mcv', label: 'MCV', type: 'number', unit: 'fL', plausible: { min: 40, max: 150 }, ranges: [{ min: 80, max: 100 }] },
        { key: 'mch', label: 'MCH', type: 'number', unit: 'pg', plausible: { min: 10, max: 50 }, ranges: [{ min: 27, max: 33 }] },
        { key: 'mchc', label: 'MCHC', type: 'number', unit: 'g/L', plausible: { min: 200, max: 450 }, ranges: [{ min: 320, max: 360 }] },
      ],
    },
    {
      id: 'white-cells',
      title: 'White cells',
      fields: [
        {
          key: 'wbc',
          label: 'White blood cells',
          type: 'number',
          unit: '×10⁹/L',
          decimals: 1,
          required: true,
          plausible: { min: 0.1, max: 500 },
          ranges: [{ min: 4, max: 10, criticalLow: 2, criticalHigh: 30 }],
        },
        percent('neut', 'Neutrophils', 40, 75),
        percent('lymph', 'Lymphocytes', 20, 45),
        percent('mono', 'Monocytes', 2, 10),
        percent('eos', 'Eosinophils', 0, 6),
        percent('baso', 'Basophils', 0, 1),
      ],
    },
    {
      id: 'platelets',
      title: 'Platelets',
      fields: [
        {
          key: 'plt',
          label: 'Platelets',
          type: 'number',
          unit: '×10⁹/L',
          required: true,
          plausible: { min: 1, max: 2000 },
          ranges: [{ min: 150, max: 400, criticalLow: 20, criticalHigh: 1000 }],
        },
      ],
    },
    commentSection,
  ],
};

// ─── Biochemistry ────────────────────────────────────────────────────────────

export const biochemistry: LabTemplate = {
  code: 'biochemistry',
  version: 1,
  name: 'Biochemistry panel',
  specimen: 'Serum',
  sections: [
    {
      id: 'glucose-kidney',
      title: 'Glucose and kidney',
      fields: [
        { key: 'glucose', label: 'Glucose (fasting)', type: 'number', unit: 'mmol/L', decimals: 1, required: true, plausible: { min: 0.5, max: 60 }, ranges: [{ min: 3.9, max: 5.5 }] },
        { key: 'urea', label: 'Urea', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 0.5, max: 80 }, ranges: [{ min: 2.5, max: 7.5 }] },
        {
          key: 'creatinine',
          label: 'Creatinine',
          type: 'number',
          unit: 'µmol/L',
          plausible: { min: 10, max: 2000 },
          ranges: [
            { sex: 'male', min: 62, max: 106 },
            { sex: 'female', min: 44, max: 88 },
          ],
        },
      ],
    },
    {
      id: 'liver',
      title: 'Liver',
      fields: [
        // One-sided ranges: only `max` is set, so anything above it is "high".
        { key: 'alt', label: 'ALT', type: 'number', unit: 'U/L', plausible: { min: 0, max: 5000 }, ranges: [{ sex: 'male', max: 41 }, { sex: 'female', max: 33 }] },
        { key: 'ast', label: 'AST', type: 'number', unit: 'U/L', plausible: { min: 0, max: 5000 }, ranges: [{ sex: 'male', max: 40 }, { sex: 'female', max: 32 }] },
        { key: 'bilirubin', label: 'Total bilirubin', type: 'number', unit: 'µmol/L', decimals: 1, plausible: { min: 0, max: 1000 }, ranges: [{ min: 3.4, max: 20.5 }] },
      ],
    },
    {
      id: 'lipids',
      title: 'Lipids',
      fields: [
        { key: 'chol', label: 'Total cholesterol', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 0.5, max: 30 }, ranges: [{ max: 5.2 }] },
        { key: 'ldl', label: 'LDL cholesterol', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 0.1, max: 20 }, ranges: [{ max: 3 }] },
        // "At least": only `min` is set, so anything below it is "low".
        { key: 'hdl', label: 'HDL cholesterol', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 0.1, max: 5 }, ranges: [{ sex: 'male', min: 1 }, { sex: 'female', min: 1.2 }] },
        { key: 'tg', label: 'Triglycerides', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 0.1, max: 50 }, ranges: [{ max: 1.7 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Urinalysis (shows qualitative 'choice' fields) ──────────────────────────

/** Dipstick grading, shared by several rows. */
const dipstickGrades: ChoiceOption[] = [
  { value: 'neg', label: 'Negative' },
  { value: 'trace', label: 'Trace', abnormal: true },
  { value: '1+', label: '+', abnormal: true },
  { value: '2+', label: '++', abnormal: true },
  { value: '3+', label: '+++', abnormal: true },
];

const dipstick = (key: string, label: string): ChoiceField => ({
  key,
  label,
  type: 'choice',
  options: dipstickGrades,
});

export const urinalysis: LabTemplate = {
  code: 'urinalysis',
  version: 1,
  name: 'Urinalysis',
  specimen: 'Urine (midstream)',
  sections: [
    {
      id: 'physical',
      title: 'Physical',
      fields: [
        {
          key: 'color',
          label: 'Color',
          type: 'choice',
          options: [
            { value: 'straw', label: 'Straw' },
            { value: 'yellow', label: 'Yellow' },
            { value: 'amber', label: 'Amber' },
            { value: 'red', label: 'Red', abnormal: true },
            { value: 'brown', label: 'Brown', abnormal: true },
          ],
        },
        {
          key: 'clarity',
          label: 'Clarity',
          type: 'choice',
          options: [
            { value: 'clear', label: 'Clear' },
            { value: 'hazy', label: 'Hazy' },
            { value: 'cloudy', label: 'Cloudy', abnormal: true },
          ],
        },
        { key: 'sg', label: 'Specific gravity', type: 'number', unit: '', decimals: 3, plausible: { min: 1, max: 1.06 }, ranges: [{ min: 1.005, max: 1.03 }] },
        { key: 'ph', label: 'pH', type: 'number', unit: '', decimals: 1, plausible: { min: 3, max: 10 }, ranges: [{ min: 4.5, max: 8 }] },
      ],
    },
    {
      id: 'dipstick',
      title: 'Chemistry (dipstick)',
      fields: [
        dipstick('protein', 'Protein'),
        dipstick('glucose', 'Glucose'),
        dipstick('ketones', 'Ketones'),
        dipstick('blood', 'Blood'),
        dipstick('leukocytes', 'Leukocytes'),
        {
          key: 'nitrite',
          label: 'Nitrite',
          type: 'choice',
          options: [
            { value: 'neg', label: 'Negative' },
            { value: 'pos', label: 'Positive', abnormal: true },
          ],
        },
      ],
    },
    {
      id: 'microscopy',
      title: 'Microscopy',
      fields: [
        { key: 'wbc', label: 'White cells', type: 'number', unit: '/hpf', plausible: { min: 0, max: 500 }, ranges: [{ min: 0, max: 5 }] },
        { key: 'rbc', label: 'Red cells', type: 'number', unit: '/hpf', plausible: { min: 0, max: 500 }, ranges: [{ min: 0, max: 2 }] },
        {
          key: 'bacteria',
          label: 'Bacteria',
          type: 'choice',
          options: [
            { value: 'none', label: 'None' },
            { value: 'few', label: 'Few', abnormal: true },
            { value: 'moderate', label: 'Moderate', abnormal: true },
            { value: 'many', label: 'Many', abnormal: true },
          ],
        },
      ],
    },
    commentSection,
  ],
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const TEMPLATES: LabTemplate[] = [cbc, biochemistry, urinalysis];

/** Looks up the exact version a result was saved with. Without a version you get the newest. */
export function getTemplate(code: string, version?: number): LabTemplate | undefined {
  const matches = TEMPLATES.filter((t) => t.code === code);
  return version === undefined
    ? matches.sort((a, b) => b.version - a.version)[0]
    : matches.find((t) => t.version === version);
}
