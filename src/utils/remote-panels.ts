/**
 * The backend stores one numeric value per lab record. When a doctor enters a
 * template (e.g. a complete blood count) or a patient reports a panel, the app
 * groups records back together by panelId or doctor/recordedAt so the user sees one result.
 *
 * Pure TypeScript with relative imports only, so it runs under Jest as-is.
 */

import { allFields, flagFor, formatRange, pickRange } from '../components/evaluate';
import { getTemplate, TEMPLATES } from '../components/templates';
import type { Flag, LabTemplate, NumberField, PatientContext, ResultEntry } from '../components/types';
import type { RemoteLabResult } from './lab-trends';

export interface RemoteLab extends RemoteLabResult {
  doctorId?: string | null;
  doctorName?: string | null;
  source?: 'DOCTOR_VERIFIED' | 'PATIENT_REPORTED' | 'CLINICIAN_ENTERED';
  panelId?: string | null;
  panelName?: string | null;
  templateCode?: string | null;
  templateVersion?: number | null;
  key?: string | null;
  entryKey?: string | null;
  valueText?: string | null;
  qualifier?: '<' | '>' | 'EXACT' | 'BELOW_LIMIT' | 'ABOVE_LIMIT' | null;
  flag?: "LOW" | "HIGH" | "NORMAL" | "CRITICAL_LOW" | "CRITICAL_HIGH" | "ABNORMAL" | null;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  comment?: string | null;
}

export interface RemoteLabGroup {
  /** Stable id for routing: "group:" + the first record's id. */
  id: string;
  template: LabTemplate;
  entries: ResultEntry[];
  /** ISO datetime shared by the grouped records. */
  recordedAt: string;
  doctorName?: string;
  source: 'DOCTOR_VERIFIED' | 'PATIENT_REPORTED';
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
    const recKey = r.key ?? r.entryKey;
    if (!r.id || (!r.testName && !recKey) || !r.recordedAt) {
      singles.push(r);
      continue;
    }
    const key = r.panelId ? `panel:${r.panelId}` : `${r.doctorId ?? 'self'}|${r.recordedAt}`;
    batches.set(key, [...(batches.get(key) ?? []), r]);
  }

  const groups: RemoteLabGroup[] = [];

  for (const batch of batches.values()) {
    const isPatientReported = batch.every((m) => m.source === 'PATIENT_REPORTED' || !m.doctorId);
    const source: 'DOCTOR_VERIFIED' | 'PATIENT_REPORTED' = isPatientReported ? 'PATIENT_REPORTED' : 'DOCTOR_VERIFIED';

    // 1. Try matching template by templateCode first
    const firstWithCode = batch.find((r) => r.templateCode);
    let matchedTemplate: LabTemplate | undefined = firstWithCode?.templateCode
      ? getTemplate(firstWithCode.templateCode, firstWithCode.templateVersion ?? undefined)
      : undefined;

    // 2. Fallback to matching template by field labels
    let best: { template: LabTemplate; matches: Map<string, { field: any; record: RemoteLab }> } | undefined;
    if (matchedTemplate) {
      const allF = allFields(matchedTemplate);
      const matches = new Map<string, { field: any; record: RemoteLab }>();
      for (const record of batch) {
        const recKey = record.key ?? record.entryKey;
        let field = recKey ? allF.find((f) => f.key === recKey) : undefined;
        if (!field && record.testName) {
          field = allF.find((f) => norm(f.label) === norm(record.testName!));
        }
        if (field && !matches.has(field.key)) {
          matches.set(field.key, { field, record });
        }
      }
      best = { template: matchedTemplate, matches };
    } else {
      for (const template of TEMPLATES) {
        const byLabel = new Map(numberFields(template).map((f) => [norm(f.label), f] as const));
        const matches = new Map<string, { field: any; record: RemoteLab }>();
        for (const record of batch) {
          if (!record.testName) continue;
          const field = byLabel.get(norm(record.testName));
          if (field && !matches.has(field.key)) matches.set(field.key, { field, record });
        }
        if (matches.size > (best?.matches.size ?? 0)) best = { template, matches };
      }
    }

    // A lone value without panelId is just a single result, not a panel.
    const hasExplicitPanel = batch.some((r) => r.panelId || r.templateCode);
    if (!best || (!hasExplicitPanel && best.matches.size < 2)) {
      singles.push(...batch);
      continue;
    }

    const used = new Set([...best.matches.values()].map((m) => m.record));
    singles.push(...batch.filter((r) => !used.has(r)));

    const entries: ResultEntry[] = [];
    for (const { field, record } of best.matches.values()) {
      const isNum = field && field.type === 'number';
      const range = isNum ? pickRange(field as NumberField, patient) : undefined;

      let val: number | string = '';
      let qualifier: '<' | '>' | undefined = undefined;
      if (record.valueText) {
        val = record.valueText;
      } else if ((record.qualifier === '<' || record.qualifier === 'BELOW_LIMIT') && record.numericValue != null) {
        val = record.numericValue;
        qualifier = '<';
      } else if ((record.qualifier === '>' || record.qualifier === 'ABOVE_LIMIT') && record.numericValue != null) {
        val = record.numericValue;
        qualifier = '>';
      } else if (record.numericValue != null) {
        val = record.numericValue;
      } else {
        val = '';
      }

      let flag: Flag | undefined = undefined;
      if (record.flag) {
        const f = record.flag.toLowerCase().replace('_', '-') as Flag;
        if (['low', 'high', 'normal', 'critical-low', 'critical-high', 'abnormal'].includes(f)) {
          flag = f;
        }
      }
      if (!flag && typeof val === 'number' && !qualifier && range) {
        flag = flagFor(val, range);
      }

      let reference: string | undefined = undefined;
      if (range) {
        reference = formatRange(range, (field as NumberField).decimals);
      } else if (record.referenceLow != null || record.referenceHigh != null) {
        reference = `${record.referenceLow ?? ''}–${record.referenceHigh ?? ''}`;
      }

      const entry: ResultEntry = {
        key: field.key,
        value: val,
        qualifier,
        unit: record.unit || (field && 'unit' in field ? (field as NumberField).unit : undefined) || undefined,
        flag,
        reference,
      };
      if (field.type === 'measurement' && record.testName) {
        entry.label = record.testName;
      }
      entries.push(entry);
    }

    const records = [...used];
    const firstRec = records[0]!;
    groups.push({
      id: `group:${firstRec.id}`,
      template: best.template,
      entries,
      recordedAt: firstRec.recordedAt!,
      doctorName: records.find((r) => r.doctorName)?.doctorName ?? undefined,
      source,
      recordIds: records.map((r) => r.id!),
    });
  }

  return { groups, singles };
}
