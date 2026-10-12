import { describe, expect, it } from '@jest/globals';

import {
  evaluateField,
  evaluateTemplate,
  formatValue,
  measurementNameKey,
  measurementUnitKey,
  parseDecimal,
  parseReference,
  parseResult,
  pickRange,
  printedReferenceKey,
} from './evaluate';
import type { EvalOptions } from './evaluate';
import {
  biochemistry,
  cardiac,
  cbc,
  getTemplate,
  inflammation,
  otherTest,
  reproductive,
  TEMPLATES,
  thyroid,
  tumorMarkers,
  urinalysis,
} from './templates';
import type { LabTemplate, NumberField, PatientContext } from './types';

const woman: PatientContext = { sex: 'female', ageYears: 34 };
const man: PatientContext = { sex: 'male', ageYears: 34 };

/** Evaluates one field of a template the same way the form does. */
function check(
  template: LabTemplate,
  key: string,
  raw: string,
  patient: PatientContext = woman,
  options?: EvalOptions,
) {
  const field = template.sections.flatMap((s) => s.fields).find((f) => f.key === key);
  if (!field) throw new Error(`No field "${key}" in template "${template.code}"`);
  return evaluateField(field, raw, patient, options);
}

describe('parseDecimal', () => {
  it('accepts a decimal comma or a dot', () => {
    expect(parseDecimal('5,4')).toBe(5.4);
    expect(parseDecimal(' 5.4 ')).toBe(5.4);
    expect(parseDecimal('.5')).toBe(0.5);
    expect(parseDecimal('-2')).toBe(-2);
  });

  it.each(['', 'abc', '1,000.5', '5.4.3', '1e3'])('rejects "%s"', (input) => {
    expect(parseDecimal(input)).toBeUndefined();
  });
});

describe('reference ranges and flags', () => {
  it("uses the range for the patient's sex", () => {
    expect(check(cbc, 'hgb', '125', man).flag).toBe('low'); // men 130–175
    expect(check(cbc, 'hgb', '125', woman).flag).toBe('normal'); // women 120–155
  });

  it('records the range that was applied', () => {
    expect(check(cbc, 'hgb', '118', woman).entry?.reference).toBe('120–155');
    expect(check(cbc, 'wbc', '6,1').entry?.reference).toBe('4.0–10.0');
  });

  it('marks a value critical only when strictly beyond the critical limit', () => {
    expect(check(cbc, 'hgb', '65').flag).toBe('critical-low');
    expect(check(cbc, 'hgb', '70').flag).toBe('low');
    expect(check(cbc, 'hgb', '210', man).flag).toBe('critical-high');
  });

  it('supports one-sided ranges', () => {
    expect(check(biochemistry, 'alt', '50', man).flag).toBe('high');
    expect(check(biochemistry, 'alt', '50', man).entry?.reference).toBe('≤ 41');
    expect(check(biochemistry, 'hdl', '0.9', man).flag).toBe('low');
    expect(check(biochemistry, 'hdl', '0.9', man).entry?.reference).toBe('≥ 1.0');
    expect(check(biochemistry, 'hdl', '1.1', woman).flag).toBe('low'); // women's floor is 1.2
  });

  it('picks the most specific range for the patient', () => {
    const field: NumberField = {
      key: 'x',
      label: 'X',
      type: 'number',
      unit: 'u',
      ranges: [
        { min: 1, max: 2 }, // everyone
        { ageMax: 17, min: 3, max: 4 }, // children
        { sex: 'female', ageMax: 17, min: 5, max: 6 }, // girls
      ],
    };
    expect(pickRange(field, { sex: 'female', ageYears: 10 })?.min).toBe(5);
    expect(pickRange(field, { sex: 'male', ageYears: 10 })?.min).toBe(3);
    expect(pickRange(field, { sex: 'male', ageYears: 40 })?.min).toBe(1);
  });

  it('gives no flag when no range applies to the patient', () => {
    const onlyMen: NumberField = {
      key: 'x',
      label: 'X',
      type: 'number',
      unit: 'u',
      ranges: [{ sex: 'male', min: 1, max: 2 }],
    };
    const result = evaluateField(onlyMen, '1.5', woman);
    expect(result.flag).toBeUndefined();
    expect(result.entry?.value).toBe(1.5);
  });
});

describe('validation', () => {
  it('rejects text that is not a number', () => {
    expect(check(cbc, 'hgb', 'abc').error).toMatch(/number/i);
  });

  it('rejects implausible values (typos) and produces no entry', () => {
    const result = check(cbc, 'hgb', '1300');
    expect(result.error).toMatch(/unlikely/i);
    expect(result.entry).toBeUndefined();
  });

  it('checks a choice against the template options', () => {
    expect(check(urinalysis, 'protein', '2+').flag).toBe('abnormal');
    expect(check(urinalysis, 'protein', 'neg').flag).toBe('normal');
    expect(check(urinalysis, 'protein', 'zzz').error).toMatch(/options/i);
  });

  it('trims free text', () => {
    expect(check(cbc, 'comment', '  hemolyzed sample ').entry?.value).toBe('hemolyzed sample');
  });

  it('only requires fields when finalizing', () => {
    expect(check(cbc, 'hgb', '', woman, { requireComplete: false })).toEqual({});
    expect(check(cbc, 'hgb', '', woman, { requireComplete: true }).error).toBe('Required');
    expect(check(cbc, 'mcv', '', woman, { requireComplete: true })).toEqual({}); // optional field
  });

  it('evaluates a whole template', () => {
    const draft = evaluateTemplate(cbc, { hgb: '118' }, woman);
    expect(draft.errors).toEqual({});
    expect(draft.entries).toHaveLength(1);

    const strict = evaluateTemplate(cbc, { hgb: '118' }, woman, { requireComplete: true });
    expect(Object.keys(strict.errors).sort()).toEqual(['plt', 'rbc', 'wbc']);

    const complete = evaluateTemplate(
      cbc,
      { hgb: '138', rbc: '4,6', wbc: '6.1', plt: '250' },
      woman,
      { requireComplete: true },
    );
    expect(complete.errors).toEqual({});
    expect(complete.entries.map((e) => e.key)).toEqual(['hgb', 'rbc', 'wbc', 'plt']);
  });
});

describe('formatValue', () => {
  it('pads to the field decimals without rounding', () => {
    const field = cbc.sections.flatMap((s) => s.fields).find((f) => f.key === 'wbc');
    if (!field) throw new Error('wbc missing');
    expect(formatValue(field, { key: 'wbc', value: 6 })).toBe('6.0');
    expect(formatValue(field, { key: 'wbc', value: 6.14 })).toBe('6.14');
  });

  it('shows the label of the chosen option', () => {
    const field = urinalysis.sections.flatMap((s) => s.fields).find((f) => f.key === 'protein');
    if (!field) throw new Error('protein missing');
    expect(formatValue(field, { key: 'protein', value: '2+' })).toBe('++');
  });
});

/** Everything that would silently misbehave in the form if a template author slipped. */
function problems(template: LabTemplate): string[] {
  const found: string[] = [];
  const fields = template.sections.flatMap((s) => s.fields);

  const keys = fields.map((f) => f.key);
  for (const key of keys.filter((k, i) => keys.indexOf(k) !== i)) found.push(`duplicate field key "${key}"`);
  const ids = template.sections.map((s) => s.id);
  for (const id of ids.filter((k, i) => ids.indexOf(k) !== i)) found.push(`duplicate section id "${id}"`);

  for (const field of fields) {
    if (field.type === 'choice') {
      const values = field.options.map((o) => o.value);
      if (new Set(values).size !== values.length) found.push(`${field.key}: duplicate option value`);
    }
    if (field.type !== 'number') continue;

    for (const r of field.ranges) {
      if (r.min !== undefined && r.max !== undefined && r.min >= r.max) found.push(`${field.key}: min >= max`);
      if (r.criticalLow !== undefined && r.min !== undefined && r.criticalLow >= r.min) found.push(`${field.key}: criticalLow >= min`);
      if (r.criticalHigh !== undefined && r.max !== undefined && r.criticalHigh <= r.max) found.push(`${field.key}: criticalHigh <= max`);
      // A normal value must never be rejected as a typo.
      if (field.plausible) {
        if (r.min !== undefined && r.min < field.plausible.min) found.push(`${field.key}: min is below the plausible limit`);
        if (r.max !== undefined && r.max > field.plausible.max) found.push(`${field.key}: max is above the plausible limit`);
      }
    }
  }
  return found;
}

describe('templates', () => {
  it.each(TEMPLATES.map((t): [string, LabTemplate] => [t.code, t]))('%s is well formed', (_code, template) => {
    expect(problems(template)).toEqual([]);
  });

  it('has unique template codes', () => {
    expect(new Set(TEMPLATES.map((t) => t.code)).size).toBe(TEMPLATES.length);
  });

  it('looks templates up by code and version', () => {
    expect(getTemplate('cbc')?.code).toBe('cbc');
    expect(getTemplate('cbc', 1)?.version).toBe(1);
    expect(getTemplate('cbc', 99)).toBeUndefined();
    expect(getTemplate('nope')).toBeUndefined();
  });
});

describe('censored values ("<0.5", ">200")', () => {
  it('parses a bound only for fields that allow it', () => {
    expect(parseResult('<0,5', true)).toEqual({ value: 0.5, qualifier: '<' });
    expect(parseResult('> 200', true)).toEqual({ value: 200, qualifier: '>' });
    expect(parseResult('5.4', true)).toEqual({ value: 5.4 });
    expect(parseResult('<0.5', false)).toBeUndefined();
    expect(parseResult('<', true)).toBeUndefined();
  });

  it('rejects a bound on a field that does not allow it', () => {
    expect(check(cbc, 'hgb', '<100').error).toMatch(/number/i);
  });

  it('keeps the bound and the qualifier in the entry', () => {
    const { entry } = check(inflammation, 'crp', '<0,6');
    expect(entry).toMatchObject({ key: 'crp', value: 0.6, qualifier: '<', unit: 'mg/L', flag: 'normal', reference: '≤ 5.0' });
    expect(check(inflammation, 'crp', '4.2').entry).not.toHaveProperty('qualifier');
  });

  it('only flags when every value that fits would get that flag', () => {
    expect(check(inflammation, 'crp', '<5').flag).toBe('normal'); // below 5, limit is ≤ 5
    expect(check(inflammation, 'crp', '<20').flag).toBeUndefined(); // could be on either side of 5
    expect(check(inflammation, 'crp', '>5').flag).toBe('high');
    expect(check(inflammation, 'crp', '>3').flag).toBeUndefined();
    expect(check(reproductive, 'estradiol', '<20', man).flag).toBe('low'); // below 20, floor is 40
    expect(check(reproductive, 'estradiol', '<100', man).flag).toBeUndefined();
  });

  it('still rejects an implausible bound', () => {
    expect(check(inflammation, 'crp', '<5000').error).toMatch(/unlikely/i);
  });

  it('shows the qualifier in the report', () => {
    const field = inflammation.sections.flatMap((s) => s.fields).find((f) => f.key === 'crp');
    if (!field) throw new Error('crp missing');
    expect(formatValue(field, { key: 'crp', value: 5, qualifier: '<' })).toBe('<5.0');
  });
});

describe('reference printed by the lab', () => {
  it('parses what labs print', () => {
    expect(parseReference('3,3-5,6')).toEqual({ min: 3.3, max: 5.6 });
    expect(parseReference('<13.1')).toEqual({ max: 13.1 });
    expect(parseReference('≥ 1')).toEqual({ min: 1 });
    expect(parseReference('negative')).toBeUndefined();
  });

  it('flags against the printed range when the template has none', () => {
    const result = check(cardiac, 'troponin', '20', woman);
    expect(result.flag).toBeUndefined();

    const field = cardiac.sections.flatMap((s) => s.fields).find((f) => f.key === 'troponin');
    if (!field) throw new Error('troponin missing');
    const withPrinted = evaluateField(field, '20', woman, { printedReference: '0–14' });
    expect(withPrinted.flag).toBe('high');
    expect(withPrinted.entry?.reference).toBe('0–14');
  });

  it('reads it from the form values by key', () => {
    const draft = evaluateTemplate(cardiac, { troponin: '20', [printedReferenceKey('troponin')]: '≤ 14' }, woman);
    expect(draft.byKey.troponin?.flag).toBe('high');
    expect(draft.entries.map((e) => e.key)).toEqual(['troponin']); // the reference is not an entry of its own
  });

  it('rejects text it cannot read', () => {
    const draft = evaluateTemplate(cardiac, { troponin: '20', [printedReferenceKey('troponin')]: 'normal' }, woman);
    expect(draft.errors.troponin).toMatch(/reference/i);
  });

  it('has no template range for women on cycle-dependent hormones, but does for men', () => {
    expect(check(reproductive, 'fsh', '8', woman).flag).toBeUndefined();
    expect(check(reproductive, 'fsh', '8', man).flag).toBe('normal');
    expect(check(reproductive, 'fsh', '20', man).flag).toBe('high');
  });
});

describe('age-banded ranges', () => {
  it('picks the PSA band for the age and gives none to women', () => {
    const psa = (ageYears: number, sex: PatientContext['sex'] = 'male') =>
      check(tumorMarkers, 'psa', '3.8', { sex, ageYears });
    expect(psa(45).flag).toBe('high'); // ≤ 2.5
    expect(psa(55).flag).toBe('high'); // ≤ 3.5
    expect(psa(65).flag).toBe('normal'); // ≤ 4.5
    expect(psa(75).flag).toBe('normal'); // ≤ 6.5
    expect(psa(55, 'female').flag).toBeUndefined();
  });
});

describe('values from real lab sheets', () => {
  // Values copied from a CBC and a serum biochemistry sheet for a 43-year-old woman.
  const patient: PatientContext = { sex: 'female', ageYears: 43 };

  it('accepts the CBC indices', () => {
    for (const [key, raw] of [
      ['rdw_cv', '12,6'],
      ['rdw_sd', '40,2'],
      ['neut_abs', '2,67'],
      ['lymph_abs', '2,27'],
      ['mono_abs', '0,41'],
      ['eos_abs', '0,06'],
      ['baso_abs', '0,02'],
      ['mpv', '9,7'],
      ['pdw', '10,2'],
      ['pct', '0,3'],
      ['plcr', '21,3'],
      ['esr', '19'],
    ] as const) {
      const result = check(cbc, key, raw, patient);
      expect([key, result.error]).toEqual([key, undefined]);
      expect([key, result.flag]).toEqual([key, 'normal']);
    }
  });

  it('accepts the biochemistry values the old template lacked', () => {
    expect(check(biochemistry, 'alp', '114', patient).flag).toBe('normal');
    expect(check(biochemistry, 'amylase', '45', patient).flag).toBe('normal');
    expect(check(biochemistry, 'iron', '26,3', patient).flag).toBe('normal');
    expect(check(biochemistry, 'protein', '66,7', patient).flag).toBe('normal');
    expect(check(biochemistry, 'uric_acid', '484', patient).flag).toBe('high'); // the sheet flags it too
  });
});

describe('template labels', () => {
  it('are not shared between templates by accident', () => {
    // Shared on purpose: the same measurement from two panels should land on one trend graph.
    const intentional = new Set(['glucose (fasting)', 'iron']);
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const template of TEMPLATES) {
      for (const field of template.sections.flatMap((s) => s.fields)) {
        if (field.type !== 'number') continue;
        const label = field.label.trim().toLowerCase();
        const other = seen.get(label);
        if (other && other !== template.code && !intentional.has(label)) clashes.push(`${label}: ${other} / ${template.code}`);
        seen.set(label, template.code);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('lets a thyroid panel be entered with antibodies below the limit', () => {
    const draft = evaluateTemplate(thyroid, { tsh: '2,1', ft4: '15', anti_tpo: '<10' }, woman);
    expect(draft.errors).toEqual({});
    expect(draft.entries.map((e) => e.key)).toEqual(['tsh', 'ft4', 'anti_tpo']);
  });
});

describe('other test (measurement field)', () => {
  const field = otherTest.sections.flatMap((s) => s.fields).find((f) => f.key === 'result');
  if (!field) throw new Error('result missing');
  const run = (value: string, extra: Record<string, string> = {}) =>
    evaluateTemplate(
      otherTest,
      { result: value, [measurementNameKey('result')]: 'Interleukin 4', ...extra },
      woman,
      { requireComplete: true },
    );

  it('saves a number under the name that was typed', () => {
    const draft = run('<2,6', {
      [measurementUnitKey('result')]: 'pg/mL',
      [printedReferenceKey('result')]: '<13.1',
    });
    expect(draft.errors).toEqual({});
    expect(draft.entries).toEqual([
      { key: 'result', label: 'Interleukin 4', value: 2.6, qualifier: '<', unit: 'pg/mL', flag: 'normal', reference: '≤ 13.1' },
    ]);
  });

  it('flags a number against the printed range', () => {
    const draft = run('20', { [printedReferenceKey('result')]: '0–13,1' });
    expect(draft.byKey.result?.flag).toBe('high');
  });

  it('keeps a result that is not a number as written, without a flag', () => {
    const draft = run('1:80', { [printedReferenceKey('result')]: '<13.1' });
    expect(draft.errors).toEqual({});
    expect(draft.entries).toEqual([{ key: 'result', label: 'Interleukin 4', value: '1:80' }]);
  });

  it('needs a name for the result and a result for the name', () => {
    const noName = evaluateTemplate(otherTest, { result: '5' }, woman);
    expect(noName.errors.result).toMatch(/name/i);

    const noResult = evaluateTemplate(otherTest, { [measurementNameKey('result')]: 'IL-4' }, woman, {
      requireComplete: true,
    });
    expect(noResult.errors.result).toBe('Required');
    expect(evaluateTemplate(otherTest, { [measurementNameKey('result')]: 'IL-4' }, woman).errors).toEqual({});
  });

  it('shows the qualifier in the report', () => {
    expect(formatValue(field, { key: 'result', label: 'IL-4', value: 2.6, qualifier: '<' })).toBe('<2.6');
    expect(formatValue(field, { key: 'result', label: 'IL-4', value: 'Positive' })).toBe('Positive');
  });
});
