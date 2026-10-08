import { describe, expect, it } from '@jest/globals';

import { evaluateField, evaluateTemplate, formatValue, parseDecimal, pickRange } from './evaluate';
import type { EvalOptions } from './evaluate';
import { biochemistry, cbc, getTemplate, TEMPLATES, urinalysis } from './templates';
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
