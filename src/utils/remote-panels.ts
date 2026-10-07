/**
 * The backend stores one numeric value per lab record. When a doctor enters a
 * template (e.g. a complete blood count) the app sends one record per value,
 * all with the same doctor and the same `recordedAt`. This puts such records
 * back together so the patient sees one result, like one they entered themselves.
 *
 * Pure TypeScript with relative imports only, so it runs under Jest as-is.
 */

import { flagFor, formatRange, pickRange } from '../components/evaluate';
import { TEMPLATES } from '../components/templates';
import type { LabTemplate, NumberField, PatientContext, ResultEntry } from '../components/types';
import type { RemoteLabResult } from './lab-trends';

export interface RemoteLab extends RemoteLabResult {
  doctorId?: string;
  doctorName?: string;
}

export interface RemoteLabGroup {
  /** Stable id for routing: "group:" + the first record's id. */
  id: string;
  template: LabTemplate;
  entries: ResultEntry[];
  /** ISO datetime shared by the grouped records. */
  recordedAt: string;
  doctorName?: string;
  recordIds: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

const numberFields = (template: LabTemplate): NumberField[] =>
  template.sections.flatMap((s) => s.fields).filter((f): f is NumberField => f.type === 'number');

const FLAG_WORD: Record<string, string> = {
  low: 'Low',
  high: 'High',
  'critical-low': 'Critical low',
  'critical-high': 'Critical high',
  abnormal: 'Abnormal',
};

/** One line per value, in template order: "Hemoglobin: 112 g/L, Low (ref 120–155)". */
export function describePanel(template: LabTemplate, entries: ResultEntry[]): string {
  const byKey = new Map(entries.map((e) => [e.key, e] as const));
  return numberFields(template)
    .flatMap((field) => {
      const entry = byKey.get(field.key);
      if (!entry) return [];
      const value = `${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`;
      const flag = entry.flag && FLAG_WORD[entry.flag] ? `, ${FLAG_WORD[entry.flag]}` : '';
      const reference = entry.reference ? ` (ref ${entry.reference})` : '';
      return [`${field.label}: ${value}${flag}${reference}`];
    })
    .join('\n');
}

export function groupRemoteLabs(
  results: RemoteLab[],
  patient: PatientContext,
): { groups: RemoteLabGroup[]; singles: RemoteLab[] } {
  const batches = new Map<string, RemoteLab[]>();
  const singles: RemoteLab[] = [];

  for (const r of results) {
    if (!r.id || !r.testName || r.numericValue == null || !r.recordedAt) {
      singles.push(r);
      continue;
    }
    const key = `${r.doctorId ?? ''}|${r.recordedAt}`;
    batches.set(key, [...(batches.get(key) ?? []), r]);
  }

  const groups: RemoteLabGroup[] = [];

  for (const batch of batches.values()) {
    // Pick the template whose value names match the most records in the batch.
    let best: { template: LabTemplate; matches: Map<string, { field: NumberField; record: RemoteLab }> } | undefined;
    for (const template of TEMPLATES) {
      const byLabel = new Map(numberFields(template).map((f) => [norm(f.label), f] as const));
      const matches = new Map<string, { field: NumberField; record: RemoteLab }>();
      for (const record of batch) {
        const field = byLabel.get(norm(record.testName!));
        if (field && !matches.has(field.key)) matches.set(field.key, { field, record });
      }
      if (matches.size > (best?.matches.size ?? 0)) best = { template, matches };
    }

    // A lone value is just a result, not a panel.
    if (!best || best.matches.size < 2) {
      singles.push(...batch);
      continue;
    }

    const used = new Set([...best.matches.values()].map((m) => m.record));
    singles.push(...batch.filter((r) => !used.has(r)));

    const entries: ResultEntry[] = [];
    for (const { field, record } of best.matches.values()) {
      const range = pickRange(field, patient);
      entries.push({
        key: field.key,
        value: record.numericValue!,
        unit: record.unit || field.unit || undefined,
        flag: flagFor(record.numericValue!, range),
        reference: range ? formatRange(range, field.decimals) : undefined,
      });
    }

    const records = [...used];
    groups.push({
      id: `group:${records[0]!.id}`,
      template: best.template,
      entries,
      recordedAt: records[0]!.recordedAt!,
      doctorName: records.find((r) => r.doctorName)?.doctorName,
      recordIds: records.map((r) => r.id!),
    });
  }

  return { groups, singles };
}
