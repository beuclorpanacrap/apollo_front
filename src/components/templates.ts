import type { ChoiceField, ChoiceOption, LabTemplate, NumberField, TemplateSection } from './types';

/*
 * HOW TO ADD A TEST
 * Take one result sheet and copy its structure:
 *   - each block on the sheet        → a section
 *   - a row with unit + reference    → a 'number' field (one `ranges` entry per sex / age band)
 *   - a row like Negative / + / ++   → a 'choice' field (mark the abnormal options)
 *   - anything else (remarks)        → a 'text' field
 * Give every field a short, stable `key` and never rename it once results exist.
 *
 * Changing a template later:
 *   - Adding fields is safe in place: saved entries carry their own flag and reference text,
 *     and the app resolves a result to the newest template by `code`.
 *   - Renaming a key or changing a range is not. That needs a `version` bump, which the app
 *     does not support yet (the picker, the unique-code test and getLabPanel all assume one
 *     entry per `code` in TEMPLATES).
 *
 * Other things worth knowing:
 *   - `censored: true` accepts "<0.5" / ">200". Use it where labs print detection limits.
 *   - `ranges: []` means "no standard range": the form asks for the range the lab printed.
 *     Use it when the range depends on the analyzer (troponin) or on something we don't
 *     know about the patient (cycle phase).
 *   - A 'measurement' field is for tests nobody templated ("Other test"): the person typing
 *     supplies the name, unit and reference. Don't use it in a real panel.
 *   - Group fields by specimen: one template has one `specimen`.
 *   - Keep number-field labels distinct between templates unless you want the trend graphs to
 *     merge them: labels also decide how a doctor's batch of records is matched to a template.
 *   - The backend stores one exact number per record. Choice and text fields, and censored
 *     values, only persist in the patient's own vault for now.
 *
 * ⚠️ The reference ranges below are typical adult values so the demo behaves realistically.
 * Real ranges depend on the lab's analyzer and method, and units differ between labs
 * (hemoglobin is g/dL on many sheets, g/L here): check them before clinical use.
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

/** Absolute white-cell count, ×10⁹/L. */
const absolute = (key: string, label: string, min: number, max: number): NumberField => ({
  key,
  label,
  type: 'number',
  unit: '×10⁹/L',
  decimals: 2,
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
        { key: 'rdw_cv', label: 'RDW-CV', type: 'number', unit: '%', decimals: 1, plausible: { min: 5, max: 40 }, ranges: [{ min: 11.5, max: 14.5 }] },
        { key: 'rdw_sd', label: 'RDW-SD', type: 'number', unit: 'fL', decimals: 1, plausible: { min: 15, max: 100 }, ranges: [{ min: 39, max: 46 }] },
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
        absolute('neut_abs', 'Neutrophils (absolute)', 2, 7.5),
        absolute('lymph_abs', 'Lymphocytes (absolute)', 1, 4),
        absolute('mono_abs', 'Monocytes (absolute)', 0.2, 0.8),
        absolute('eos_abs', 'Eosinophils (absolute)', 0, 0.5),
        absolute('baso_abs', 'Basophils (absolute)', 0, 0.1),
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
        { key: 'mpv', label: 'MPV', type: 'number', unit: 'fL', decimals: 1, plausible: { min: 3, max: 25 }, ranges: [{ min: 7.5, max: 11.5 }] },
        { key: 'pdw', label: 'PDW', type: 'number', unit: 'fL', decimals: 1, plausible: { min: 5, max: 40 }, ranges: [{ min: 10, max: 18 }] },
        { key: 'pct', label: 'Plateletcrit (PCT)', type: 'number', unit: '%', decimals: 2, plausible: { min: 0.01, max: 2 }, ranges: [{ min: 0.2, max: 0.5 }] },
        percent('plcr', 'Platelet large cell ratio (PLCR)', 13, 43),
      ],
    },
    {
      id: 'esr',
      title: 'Sedimentation',
      fields: [
        {
          key: 'esr',
          label: 'ESR',
          type: 'number',
          unit: 'mm/h',
          plausible: { min: 0, max: 150 },
          ranges: [
            { sex: 'male', min: 0, max: 15 },
            { sex: 'female', min: 0, max: 20 },
          ],
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
        { key: 'alp', label: 'ALP', type: 'number', unit: 'U/L', plausible: { min: 0, max: 3000 }, ranges: [{ max: 115 }] },
        { key: 'ggt', label: 'GGT', type: 'number', unit: 'U/L', plausible: { min: 0, max: 3000 }, ranges: [{ sex: 'male', max: 61 }, { sex: 'female', max: 36 }] },
      ],
    },
    {
      id: 'proteins-minerals',
      title: 'Protein, iron and other',
      fields: [
        { key: 'protein', label: 'Total protein', type: 'number', unit: 'g/L', plausible: { min: 20, max: 150 }, ranges: [{ min: 66, max: 83 }] },
        {
          key: 'uric_acid',
          label: 'Uric acid',
          type: 'number',
          unit: 'µmol/L',
          plausible: { min: 20, max: 1500 },
          ranges: [{ sex: 'male', min: 202, max: 417 }, { sex: 'female', min: 143, max: 339 }],
        },
        {
          key: 'iron',
          label: 'Iron',
          type: 'number',
          unit: 'µmol/L',
          decimals: 1,
          plausible: { min: 0.5, max: 100 },
          ranges: [{ sex: 'male', min: 11.6, max: 31.3 }, { sex: 'female', min: 9, max: 30.4 }],
        },
        { key: 'amylase', label: 'Amylase', type: 'number', unit: 'U/L', plausible: { min: 0, max: 5000 }, ranges: [{ min: 28, max: 100 }] },
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

// ─── Electrolytes ────────────────────────────────────────────────────────────

export const electrolytes: LabTemplate = {
  code: 'electrolytes',
  version: 1,
  name: 'Electrolytes',
  specimen: 'Serum',
  sections: [
    {
      id: 'electrolytes',
      title: 'Electrolytes',
      fields: [
        { key: 'na', label: 'Sodium', type: 'number', unit: 'mmol/L', plausible: { min: 80, max: 200 }, ranges: [{ min: 136, max: 145, criticalLow: 120, criticalHigh: 160 }] },
        { key: 'k', label: 'Potassium', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 1, max: 12 }, ranges: [{ min: 3.5, max: 5.1, criticalLow: 2.5, criticalHigh: 6.5 }] },
        { key: 'cl', label: 'Chloride', type: 'number', unit: 'mmol/L', plausible: { min: 60, max: 150 }, ranges: [{ min: 98, max: 107 }] },
      ],
    },
    {
      id: 'minerals',
      title: 'Minerals',
      fields: [
        { key: 'ca', label: 'Calcium (total)', type: 'number', unit: 'mmol/L', decimals: 2, plausible: { min: 0.5, max: 6 }, ranges: [{ min: 2.15, max: 2.55, criticalLow: 1.5, criticalHigh: 3.5 }] },
        { key: 'mg', label: 'Magnesium', type: 'number', unit: 'mmol/L', decimals: 2, plausible: { min: 0.1, max: 5 }, ranges: [{ min: 0.66, max: 1.07 }] },
        { key: 'phos', label: 'Phosphate', type: 'number', unit: 'mmol/L', decimals: 2, plausible: { min: 0.1, max: 6 }, ranges: [{ min: 0.81, max: 1.45 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Thyroid ─────────────────────────────────────────────────────────────────

export const thyroid: LabTemplate = {
  code: 'thyroid',
  version: 1,
  name: 'Thyroid',
  specimen: 'Serum',
  sections: [
    {
      id: 'hormones',
      title: 'Hormones',
      fields: [
        { key: 'tsh', label: 'TSH', type: 'number', unit: 'mIU/L', decimals: 2, plausible: { min: 0.005, max: 200 }, ranges: [{ min: 0.4, max: 4 }] },
        { key: 'ft4', label: 'Free T4', type: 'number', unit: 'pmol/L', decimals: 1, plausible: { min: 1, max: 150 }, ranges: [{ min: 12, max: 22 }] },
        { key: 'ft3', label: 'Free T3', type: 'number', unit: 'pmol/L', decimals: 1, plausible: { min: 0.5, max: 50 }, ranges: [{ min: 3.1, max: 6.8 }] },
      ],
    },
    {
      id: 'antibodies',
      title: 'Antibodies',
      fields: [
        { key: 'anti_tpo', label: 'Anti-TPO', type: 'number', unit: 'IU/mL', censored: true, plausible: { min: 0, max: 5000 }, ranges: [{ max: 34 }] },
        { key: 'anti_tg', label: 'Anti-thyroglobulin', type: 'number', unit: 'IU/mL', censored: true, plausible: { min: 0, max: 5000 }, ranges: [{ max: 115 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Coagulation ─────────────────────────────────────────────────────────────

export const coagulation: LabTemplate = {
  code: 'coagulation',
  version: 1,
  name: 'Coagulation',
  specimen: 'Citrated plasma',
  sections: [
    {
      id: 'clotting',
      title: 'Clotting tests',
      fields: [
        { key: 'pt', label: 'Prothrombin time', type: 'number', unit: 's', decimals: 1, plausible: { min: 5, max: 200 }, ranges: [{ min: 11, max: 14 }] },
        { key: 'pt_index', label: 'Prothrombin index', type: 'number', unit: '%', plausible: { min: 5, max: 200 }, ranges: [{ min: 70, max: 130 }] },
        // On warfarin an INR of 2–3 is the target and still reads "high" against this healthy range.
        { key: 'inr', label: 'INR', type: 'number', unit: '', decimals: 2, plausible: { min: 0.5, max: 20 }, ranges: [{ min: 0.8, max: 1.2, criticalHigh: 5 }] },
        { key: 'aptt', label: 'aPTT', type: 'number', unit: 's', decimals: 1, plausible: { min: 10, max: 250 }, ranges: [{ min: 25, max: 35 }] },
        { key: 'fibrinogen', label: 'Fibrinogen', type: 'number', unit: 'g/L', decimals: 1, plausible: { min: 0.1, max: 15 }, ranges: [{ min: 2, max: 4 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Iron studies ────────────────────────────────────────────────────────────

export const iron: LabTemplate = {
  code: 'iron',
  version: 1,
  name: 'Iron studies',
  specimen: 'Serum',
  sections: [
    {
      id: 'iron',
      title: 'Iron',
      fields: [
        // Same label as the biochemistry panel on purpose: both feed one trend graph.
        {
          key: 'iron',
          label: 'Iron',
          type: 'number',
          unit: 'µmol/L',
          decimals: 1,
          plausible: { min: 0.5, max: 100 },
          ranges: [{ sex: 'male', min: 11.6, max: 31.3 }, { sex: 'female', min: 9, max: 30.4 }],
        },
        { key: 'tibc', label: 'TIBC', type: 'number', unit: 'µmol/L', decimals: 1, plausible: { min: 5, max: 150 }, ranges: [{ min: 45, max: 72 }] },
        { key: 'transferrin', label: 'Transferrin', type: 'number', unit: 'g/L', decimals: 1, plausible: { min: 0.3, max: 10 }, ranges: [{ min: 2, max: 3.6 }] },
        { key: 'tsat', label: 'Transferrin saturation', type: 'number', unit: '%', plausible: { min: 0, max: 100 }, ranges: [{ min: 20, max: 50 }] },
        {
          key: 'ferritin',
          label: 'Ferritin',
          type: 'number',
          unit: 'µg/L',
          plausible: { min: 0, max: 10000 },
          ranges: [{ sex: 'male', min: 30, max: 400 }, { sex: 'female', min: 13, max: 150 }],
        },
      ],
    },
    commentSection,
  ],
};

// ─── HbA1c and diabetes ──────────────────────────────────────────────────────

export const hba1c: LabTemplate = {
  code: 'hba1c',
  version: 1,
  name: 'HbA1c',
  specimen: 'Whole blood (EDTA)',
  sections: [
    {
      id: 'hba1c',
      title: 'Glycated hemoglobin',
      fields: [
        { key: 'hba1c', label: 'HbA1c', type: 'number', unit: '%', decimals: 1, plausible: { min: 2, max: 20 }, ranges: [{ min: 4, max: 5.6 }] },
        { key: 'hba1c_ifcc', label: 'HbA1c (IFCC)', type: 'number', unit: 'mmol/mol', plausible: { min: 10, max: 200 }, ranges: [{ min: 20, max: 38 }] },
      ],
    },
    commentSection,
  ],
};

export const diabetes: LabTemplate = {
  code: 'diabetes',
  version: 1,
  name: 'Diabetes markers',
  specimen: 'Serum',
  sections: [
    {
      id: 'glycemia',
      title: 'Glucose and insulin',
      fields: [
        // Same label as the biochemistry panel on purpose: both feed one trend graph.
        { key: 'glucose', label: 'Glucose (fasting)', type: 'number', unit: 'mmol/L', decimals: 1, plausible: { min: 0.5, max: 60 }, ranges: [{ min: 3.9, max: 5.5 }] },
        { key: 'insulin', label: 'Insulin (fasting)', type: 'number', unit: 'µIU/mL', decimals: 1, plausible: { min: 0, max: 1000 }, ranges: [{ min: 2.6, max: 24.9 }] },
        { key: 'c_peptide', label: 'C-peptide', type: 'number', unit: 'nmol/L', decimals: 2, plausible: { min: 0, max: 10 }, ranges: [{ min: 0.37, max: 1.47 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Inflammation and cardiac markers (labs print "<5" style limits) ─────────

export const inflammation: LabTemplate = {
  code: 'inflammation',
  version: 1,
  name: 'Inflammation markers',
  specimen: 'Serum',
  sections: [
    {
      id: 'markers',
      title: 'Markers',
      fields: [
        { key: 'crp', label: 'CRP', type: 'number', unit: 'mg/L', decimals: 1, censored: true, plausible: { min: 0, max: 600 }, ranges: [{ max: 5 }] },
        { key: 'procalcitonin', label: 'Procalcitonin', type: 'number', unit: 'ng/mL', decimals: 2, censored: true, plausible: { min: 0, max: 1000 }, ranges: [{ max: 0.5 }] },
      ],
    },
    commentSection,
  ],
};

export const cardiac: LabTemplate = {
  code: 'cardiac',
  version: 1,
  name: 'Cardiac markers',
  specimen: 'Serum',
  sections: [
    {
      id: 'markers',
      title: 'Markers',
      fields: [
        // The 99th-percentile cut-off differs per assay, so no template range: enter the lab's printed one.
        { key: 'troponin', label: 'Troponin (high-sensitivity)', type: 'number', unit: 'ng/L', censored: true, plausible: { min: 0, max: 100000 }, ranges: [] },
        { key: 'ck_mb', label: 'CK-MB (mass)', type: 'number', unit: 'ng/mL', decimals: 1, censored: true, plausible: { min: 0, max: 1000 }, ranges: [{ max: 5 }] },
        {
          key: 'nt_probnp',
          label: 'NT-proBNP',
          type: 'number',
          unit: 'pg/mL',
          censored: true,
          plausible: { min: 0, max: 70000 },
          ranges: [{ ageMax: 74, max: 125 }, { ageMin: 75, max: 450 }],
        },
      ],
    },
    commentSection,
  ],
};

// ─── Vitamins ────────────────────────────────────────────────────────────────

export const vitamins: LabTemplate = {
  code: 'vitamins',
  version: 1,
  name: 'Vitamins',
  specimen: 'Serum',
  sections: [
    {
      id: 'vitamins',
      title: 'Vitamins',
      fields: [
        { key: 'vit_d', label: '25-OH vitamin D', type: 'number', unit: 'ng/mL', decimals: 1, censored: true, plausible: { min: 1, max: 300 }, ranges: [{ min: 30, max: 100 }] },
        { key: 'b12', label: 'Vitamin B12', type: 'number', unit: 'pg/mL', censored: true, plausible: { min: 20, max: 5000 }, ranges: [{ min: 197, max: 771 }] },
        { key: 'folate', label: 'Folate', type: 'number', unit: 'ng/mL', decimals: 1, censored: true, plausible: { min: 0.5, max: 100 }, ranges: [{ min: 4 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Tumor markers ───────────────────────────────────────────────────────────

export const tumorMarkers: LabTemplate = {
  code: 'tumor-markers',
  version: 1,
  name: 'Tumor markers',
  specimen: 'Serum',
  sections: [
    {
      id: 'markers',
      title: 'Markers',
      fields: [
        { key: 'cea', label: 'CEA', type: 'number', unit: 'ng/mL', decimals: 1, censored: true, plausible: { min: 0, max: 100000 }, ranges: [{ max: 5 }] },
        { key: 'ca199', label: 'CA 19-9', type: 'number', unit: 'U/mL', censored: true, plausible: { min: 0, max: 1000000 }, ranges: [{ max: 37 }] },
        { key: 'ca125', label: 'CA 125', type: 'number', unit: 'U/mL', censored: true, plausible: { min: 0, max: 1000000 }, ranges: [{ max: 35 }] },
        { key: 'afp', label: 'AFP', type: 'number', unit: 'ng/mL', decimals: 1, censored: true, plausible: { min: 0, max: 1000000 }, ranges: [{ max: 10 }] },
        {
          key: 'psa',
          label: 'PSA (total)',
          type: 'number',
          unit: 'ng/mL',
          decimals: 2,
          censored: true,
          plausible: { min: 0, max: 10000 },
          // Age-banded and men only: for anyone else the form asks for the lab's printed range.
          ranges: [
            { sex: 'male', ageMax: 49, max: 2.5 },
            { sex: 'male', ageMin: 50, ageMax: 59, max: 3.5 },
            { sex: 'male', ageMin: 60, ageMax: 69, max: 4.5 },
            { sex: 'male', ageMin: 70, max: 6.5 },
          ],
        },
      ],
    },
    commentSection,
  ],
};

// ─── Hormones: reproductive and adrenal ──────────────────────────────────────

export const reproductive: LabTemplate = {
  code: 'reproductive',
  version: 1,
  name: 'Reproductive hormones',
  specimen: 'Serum',
  sections: [
    {
      id: 'sample',
      title: 'Sample',
      fields: [
        {
          key: 'cycle_phase',
          label: 'Cycle phase',
          type: 'choice',
          options: [
            { value: 'follicular', label: 'Follicular' },
            { value: 'midcycle', label: 'Mid-cycle' },
            { value: 'luteal', label: 'Luteal' },
            { value: 'postmenopausal', label: 'Postmenopausal' },
            { value: 'na', label: 'Not applicable' },
          ],
        },
      ],
    },
    {
      id: 'pituitary',
      title: 'Pituitary',
      fields: [
        // Women's ranges depend on the cycle phase, which we can't evaluate: the form takes the printed range.
        { key: 'fsh', label: 'FSH', type: 'number', unit: 'IU/L', decimals: 1, plausible: { min: 0, max: 300 }, ranges: [{ sex: 'male', min: 1.5, max: 12.4 }] },
        { key: 'lh', label: 'LH', type: 'number', unit: 'IU/L', decimals: 1, plausible: { min: 0, max: 300 }, ranges: [{ sex: 'male', min: 1.7, max: 8.6 }] },
        {
          key: 'prolactin',
          label: 'Prolactin',
          type: 'number',
          unit: 'mIU/L',
          plausible: { min: 0, max: 10000 },
          ranges: [{ sex: 'male', min: 86, max: 324 }, { sex: 'female', min: 102, max: 496 }],
        },
      ],
    },
    {
      id: 'steroids',
      title: 'Sex steroids',
      fields: [
        { key: 'estradiol', label: 'Estradiol', type: 'number', unit: 'pmol/L', censored: true, plausible: { min: 0, max: 10000 }, ranges: [{ sex: 'male', min: 40, max: 161 }] },
        { key: 'progesterone', label: 'Progesterone', type: 'number', unit: 'nmol/L', decimals: 1, censored: true, plausible: { min: 0, max: 500 }, ranges: [] },
        {
          key: 'testosterone',
          label: 'Testosterone (total)',
          type: 'number',
          unit: 'nmol/L',
          decimals: 2,
          censored: true,
          plausible: { min: 0, max: 100 },
          ranges: [{ sex: 'male', min: 8.64, max: 29 }, { sex: 'female', min: 0.29, max: 1.67 }],
        },
        { key: 'dheas', label: 'DHEA-S', type: 'number', unit: 'µmol/L', decimals: 1, plausible: { min: 0, max: 50 }, ranges: [] },
      ],
    },
    commentSection,
  ],
};

export const adrenal: LabTemplate = {
  code: 'adrenal',
  version: 1,
  name: 'Adrenal hormones',
  specimen: 'Serum',
  sections: [
    {
      id: 'sample',
      title: 'Sample',
      fields: [{ key: 'sampled_at', label: 'Time of sampling', type: 'text' }],
    },
    {
      id: 'hormones',
      title: 'Hormones',
      fields: [
        // Cortisol follows a daily rhythm, so each time window is its own field.
        { key: 'cortisol', label: 'Cortisol (morning)', type: 'number', unit: 'nmol/L', plausible: { min: 0, max: 3000 }, ranges: [{ min: 171, max: 536 }] },
        { key: 'cortisol_pm', label: 'Cortisol (16–20 h)', type: 'number', unit: 'nmol/L', plausible: { min: 0, max: 3000 }, ranges: [{ min: 64, max: 327 }] },
        { key: 'acth', label: 'ACTH (morning)', type: 'number', unit: 'pg/mL', decimals: 1, plausible: { min: 0, max: 2000 }, ranges: [{ min: 7.2, max: 63.3 }] },
      ],
    },
    commentSection,
  ],
};

// ─── Qualitative: serology (all 'choice' fields) ─────────────────────────────

const serologyResults: ChoiceOption[] = [
  { value: 'neg', label: 'Negative' },
  { value: 'equivocal', label: 'Equivocal', abnormal: true },
  { value: 'pos', label: 'Positive', abnormal: true },
];

const serology = (key: string, label: string): ChoiceField => ({
  key,
  label,
  type: 'choice',
  options: serologyResults,
});

export const infectiousSerology: LabTemplate = {
  code: 'serology',
  version: 1,
  name: 'Infectious serology',
  specimen: 'Serum',
  sections: [
    {
      id: 'screen',
      title: 'Screening',
      fields: [
        serology('hbsag', 'HBsAg'),
        serology('anti_hcv', 'Anti-HCV'),
        serology('hiv', 'HIV Ag/Ab'),
        serology('syphilis', 'Syphilis (treponemal)'),
      ],
    },
    commentSection,
  ],
};

// ─── Any other test (the name, unit and reference are typed in) ──────────────

/**
 * For a test that has no template of its own. Charts and saves like any numeric result
 * when the result is a number; stays as written when it is text.
 */
export const otherTest: LabTemplate = {
  code: 'other',
  version: 1,
  name: 'Other test',
  specimen: 'As on the report',
  sections: [
    {
      id: 'test',
      title: 'Test',
      fields: [{ key: 'result', label: 'Result', type: 'measurement', required: true }],
    },
    commentSection,
  ],
};

// ─── Registry ────────────────────────────────────────────────────────────────

/** Order here is the order of the picker. */
export const TEMPLATES: LabTemplate[] = [
  cbc,
  biochemistry,
  urinalysis,
  electrolytes,
  thyroid,
  coagulation,
  iron,
  hba1c,
  diabetes,
  inflammation,
  cardiac,
  vitamins,
  tumorMarkers,
  reproductive,
  adrenal,
  infectiousSerology,
  otherTest,
];

/** Looks up the exact version a result was saved with. Without a version you get the newest. */
export function getTemplate(code: string, version?: number): LabTemplate | undefined {
  const matches = TEMPLATES.filter((t) => t.code === code);
  return version === undefined
    ? matches.sort((a, b) => b.version - a.version)[0]
    : matches.find((t) => t.version === version);
}
