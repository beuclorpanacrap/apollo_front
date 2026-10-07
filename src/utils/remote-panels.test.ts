import { describe, expect, it } from '@jest/globals';

import { describePanel, groupRemoteLabs, type RemoteLab } from './remote-panels';

const woman = { sex: 'female', ageYears: 34 } as const;
const rec = (id: string, testName: string, numericValue: number, unit: string, extra: Partial<RemoteLab> = {}): RemoteLab => ({
  id,
  testName,
  numericValue,
  unit,
  doctorId: 'doc1',
  doctorName: 'Dr. House',
  recordedAt: '2026-03-01T09:30:00.000Z',
  ...extra,
});

const cbcBatch = [
  rec('1', 'Hemoglobin', 112, 'g/L'),
  rec('2', 'Red blood cells', 4.4, '10¹²/L'),
  rec('3', 'White blood cells', 6.1, '10⁹/L'),
  rec('4', 'Platelets', 250, '10⁹/L'),
];

describe('groupRemoteLabs', () => {
  it('puts the values of one submission back together as one template result', () => {
    const { groups, singles } = groupRemoteLabs(cbcBatch, woman);

    expect(singles).toHaveLength(0);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'group:1',
      recordedAt: '2026-03-01T09:30:00.000Z',
      doctorName: 'Dr. House',
      recordIds: ['1', '2', '3', '4'],
    });
    expect(groups[0]!.template.code).toBe('cbc');
    expect(groups[0]!.entries.find((e) => e.key === 'hgb')).toEqual({
      key: 'hgb',
      value: 112,
      unit: 'g/L',
      flag: 'low',
      reference: '120–155',
    });
  });

  it('uses the patient to pick the reference range', () => {
    const man = groupRemoteLabs(cbcBatch, { sex: 'male', ageYears: 34 }).groups[0]!;
    expect(man.entries.find((e) => e.key === 'hgb')?.reference).toBe('130–175');

    const unknown = groupRemoteLabs(cbcBatch, {}).groups[0]!;
    expect(unknown.entries.find((e) => e.key === 'hgb')).toMatchObject({ flag: undefined, reference: undefined });
  });

  it('keeps separate submissions and separate doctors apart', () => {
    const later = cbcBatch.map((r) => ({ ...r, id: `l${r.id}`, recordedAt: '2026-04-01T10:00:00.000Z' }));
    const other = cbcBatch.map((r) => ({ ...r, id: `o${r.id}`, doctorId: 'doc2' }));
    expect(groupRemoteLabs([...cbcBatch, ...later, ...other], woman).groups).toHaveLength(3);
  });

  it('leaves a lone value, unknown tests and records without a date as single results', () => {
    const lone = rec('a', 'Hemoglobin', 130, 'g/L', { recordedAt: '2026-05-01T08:00:00.000Z' });
    const unknown = rec('b', 'Fasting Blood Glucose', 95.5, 'mg/dL', { recordedAt: '2026-06-01T08:00:00.000Z' });
    const undated = rec('c', 'Hemoglobin', 130, 'g/L', { recordedAt: undefined });
    const { groups, singles } = groupRemoteLabs([lone, unknown, undated], woman);

    expect(groups).toHaveLength(0);
    expect(singles.map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('keeps extra records from the same submission as singles', () => {
    const { groups, singles } = groupRemoteLabs([...cbcBatch, rec('x', 'Fasting Blood Glucose', 95, 'mg/dL')], woman);
    expect(groups[0]!.recordIds).toHaveLength(4);
    expect(singles.map((s) => s.id)).toEqual(['x']);
  });
});

describe('describePanel', () => {
  it('lists one line per value with its flag and reference range', () => {
    const group = groupRemoteLabs(cbcBatch, woman).groups[0]!;
    expect(describePanel(group.template, group.entries).split('\n')).toEqual([
      'Hemoglobin: 112 g/L, Low (ref 120–155)',
      'Red blood cells: 4.4 10¹²/L (ref 4.1–5.1)',
      'White blood cells: 6.1 10⁹/L (ref 4.0–10.0)',
      'Platelets: 250 10⁹/L (ref 150–400)',
    ]);
  });
});
