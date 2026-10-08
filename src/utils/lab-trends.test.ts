import { describe, expect, it } from '@jest/globals';

import type { LocalLabResult } from '../types/local-records';
import { buildTrendSeries, getLabPanel, parseReference, summarizePanel, toDateKey } from './lab-trends';

const base = { source: 'PATIENT_LOCAL', createdAt: '', updatedAt: '' } as const;

const cbc = (id: string, dateAdded: string, hgb: number, flag: 'normal' | 'low' = 'normal'): LocalLabResult => ({
  ...base,
  id,
  mode: 'freeform',
  testName: 'Complete blood count',
  freeformResult: '2 values',
  dateAdded,
  panel: {
    templateCode: 'cbc',
    templateVersion: 1,
    status: 'final',
    entries: [
      { key: 'hgb', value: hgb, unit: 'g/L', flag, reference: '120–155' },
      { key: 'wbc', value: 6.1, unit: '10⁹/L', flag: 'normal', reference: '4.0–10.0' },
    ],
  },
});

describe('parseReference', () => {
  it('reads ranges and one-sided limits', () => {
    expect(parseReference('120–155')).toEqual({ min: 120, max: 155 });
    expect(parseReference('70-100')).toEqual({ min: 70, max: 100 });
    expect(parseReference('4,5–5,9')).toEqual({ min: 4.5, max: 5.9 });
    expect(parseReference('≤ 5.2')).toEqual({ max: 5.2 });
    expect(parseReference('≥ 1.0')).toEqual({ min: 1 });
  });

  it('ignores text it cannot read', () => {
    expect(parseReference('negative')).toBeUndefined();
    expect(parseReference(undefined)).toBeUndefined();
  });
});

describe('toDateKey', () => {
  it('keeps plain dates and converts datetimes', () => {
    expect(toDateKey('2026-03-04')).toBe('2026-03-04');
    expect(toDateKey('2026-03-04T12:00:00')).toBe('2026-03-04');
    expect(toDateKey('nope')).toBe('');
  });
});

describe('buildTrendSeries', () => {
  it('builds one series per value, oldest first, with the latest range', () => {
    const series = buildTrendSeries([cbc('b', '2026-02-01', 118, 'low'), cbc('a', '2026-01-01', 138)], []);
    const hgb = series.find((s) => s.key === 'hemoglobin')!;

    expect(hgb.points.map((p) => [p.date, p.value, p.flag])).toEqual([
      ['2026-01-01', 138, 'normal'],
      ['2026-02-01', 118, 'low'],
    ]);
    expect(hgb.unit).toBe('g/L');
    expect(hgb.range).toEqual({ min: 120, max: 155 });
  });

  it('merges doctor-entered results with the same name and flags them from the range', () => {
    const series = buildTrendSeries(
      [cbc('a', '2026-01-01', 138)],
      [{ id: 'r1', testName: 'Hemoglobin', numericValue: 110, unit: 'g/L', recordedAt: '2026-03-01T09:00:00' }],
    );
    const hgb = series.find((s) => s.key === 'hemoglobin')!;

    expect(hgb.points).toHaveLength(2);
    expect(hgb.points[1]).toMatchObject({ date: '2026-03-01', value: 110, flag: 'low', sourceId: 'r1' });
  });

  it('skips text values and records without a number', () => {
    const lab = cbc('a', '2026-01-01', 138);
    lab.panel!.entries.push({ key: 'notes', value: 'fine' });
    const series = buildTrendSeries([lab], [{ testName: 'Glucose' }]);
    expect(series.map((s) => s.key).sort()).toEqual(['hemoglobin', 'white blood cells']);
  });

  it('reads old structured records', () => {
    const series = buildTrendSeries(
      [
        { ...base, id: 's1', mode: 'structured', testName: 'HbA1c', numericValue: 5.4, unit: '%', referenceRange: '4–5.6', dateAdded: '2026-01-01' },
        { ...base, id: 's2', mode: 'structured', testName: 'hba1c', numericValue: 6.1, unit: '%', referenceRange: '4–5.6', dateAdded: '2026-02-01' },
      ],
      [],
    );
    expect(series).toHaveLength(1);
    expect(series[0]!.points.map((p) => p.flag)).toEqual(['normal', 'high']);
  });
});

describe('getLabPanel', () => {
  it('reads results saved as JSON text before panels existed', () => {
    const legacy: LocalLabResult = {
      ...base,
      id: 'old',
      mode: 'freeform',
      testName: 'Complete blood count',
      freeformResult: JSON.stringify([{ key: 'hgb', value: 138, unit: 'g/L', flag: 'normal' }]),
      dateAdded: '2026-01-01',
    };
    const found = getLabPanel(legacy);
    expect(found?.template.code).toBe('cbc');
    expect(found?.panel.entries).toHaveLength(1);
    expect(buildTrendSeries([legacy], [])[0]!.label).toBe('Hemoglobin');
  });

  it('leaves ordinary free text alone', () => {
    expect(getLabPanel({ ...base, id: 'x', mode: 'freeform', testName: 'Other', freeformResult: 'looks fine', dateAdded: '2026-01-01' })).toBeUndefined();
  });
});

describe('summarizePanel', () => {
  it('counts values and out-of-range ones', () => {
    expect(summarizePanel([{ key: 'a', value: 1, flag: 'normal' }])).toBe('1 value');
    expect(summarizePanel([{ key: 'a', value: 1, flag: 'low' }, { key: 'b', value: 2, flag: 'normal' }])).toBe('2 values · 1 out of range');
  });
});
