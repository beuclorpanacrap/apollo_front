/**
 * Turns saved lab results into series for the trend graphs: one series per
 * measured value (e.g. Hemoglobin), one point per day it was measured.
 *
 * Pure TypeScript with relative imports only, so it runs under Jest as-is.
 */

import { allFields, flagFor } from '../components/evaluate';
import { getTemplate, TEMPLATES } from '../components/templates';
import type { Flag, LabTemplate, ReferenceRange, ResultEntry } from '../components/types';
import type { LocalLabPanel, LocalLabResult } from '../types/local-records';

export interface TrendPoint {
  /** yyyy-mm-dd */
  date: string;
  value: number;
  flag?: Flag;
  /** The record this point came from. */
  sourceId: string;
}

export interface TrendSeries {
  /** Lower-cased label, used to merge the same measurement from different sources. */
  key: string;
  label: string;
  unit?: string;
  /** Oldest first. */
  points: TrendPoint[];
  /** Reference range taken from the most recent point that has one. */
  range?: Pick<ReferenceRange, 'min' | 'max'>;
}

/** The slice of a doctor-entered result the graphs need (matches LabTestResultResponse). */
export interface RemoteLabResult {
  id?: string;
  testName?: string;
  numericValue?: number;
  unit?: string;
  recordedAt?: string;
}

const NUMBER = '(-?\\d+(?:[.,]\\d+)?)';
const toNumber = (s: string) => Number(s.replace(',', '.'));

/** "130–175", "70-100", "≤ 5.2" and "≥ 1.0" → a range. Anything else → undefined. */
export function parseReference(text?: string): Pick<ReferenceRange, 'min' | 'max'> | undefined {
  if (!text) return undefined;
  const between = new RegExp(`^\\s*${NUMBER}\\s*[–-]\\s*${NUMBER}\\s*$`).exec(text);
  if (between) return { min: toNumber(between[1]!), max: toNumber(between[2]!) };
  const atMost = new RegExp(`^\\s*(?:≤|<=?)\\s*${NUMBER}\\s*$`).exec(text);
  if (atMost) return { max: toNumber(atMost[1]!) };
  const atLeast = new RegExp(`^\\s*(?:≥|>=?)\\s*${NUMBER}\\s*$`).exec(text);
  if (atLeast) return { min: toNumber(atLeast[1]!) };
  return undefined;
}

/** yyyy-mm-dd of a stored date (plain date or ISO datetime), in the viewer's time zone. */
export function toDateKey(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The template panel behind a local result. Results saved before panels existed
 * kept their entries as JSON text in `freeformResult`; read those back too.
 */
export function getLabPanel(lab: LocalLabResult): { template: LabTemplate; panel: LocalLabPanel } | undefined {
  if (lab.panel) {
    const template = getTemplate(lab.panel.templateCode);
    return template ? { template, panel: lab.panel } : undefined;
  }
  if (lab.mode !== 'freeform' || !lab.freeformResult?.trim().startsWith('[')) return undefined;
  const template = TEMPLATES.find((t) => t.name === lab.testName);
  if (!template) return undefined;
  try {
    const parsed: unknown = JSON.parse(lab.freeformResult);
    if (!Array.isArray(parsed)) return undefined;
    const entries = parsed.filter(
      (e): e is ResultEntry => !!e && typeof e === 'object' && typeof (e as ResultEntry).key === 'string' && 'value' in e,
    );
    if (entries.length === 0) return undefined;
    return { template, panel: { templateCode: template.code, templateVersion: template.version, status: 'final', entries } };
  } catch {
    return undefined;
  }
}

/** "4 values · 1 out of range", for list cards. */
export function summarizePanel(entries: ResultEntry[]): string {
  const outOfRange = entries.filter((e) => e.flag !== undefined && e.flag !== 'normal').length;
  const count = `${entries.length} ${entries.length === 1 ? 'value' : 'values'}`;
  return outOfRange > 0 ? `${count} · ${outOfRange} out of range` : count;
}

export const seriesKey = (label: string) => label.trim().toLowerCase();

export function buildTrendSeries(localLabs: LocalLabResult[], remoteLabs: RemoteLabResult[]): TrendSeries[] {
  const byKey = new Map<string, TrendSeries & { unitDate: string; rangeDate: string }>();

  function add(
    label: string,
    point: TrendPoint,
    unit: string | undefined,
    range: Pick<ReferenceRange, 'min' | 'max'> | undefined,
  ) {
    if (!point.date || !Number.isFinite(point.value)) return;
    const key = seriesKey(label);
    let series = byKey.get(key);
    if (!series) {
      series = { key, label: label.trim(), points: [], unitDate: '', rangeDate: '' };
      byKey.set(key, series);
    }
    series.points.push(point);
    if (unit && point.date >= series.unitDate) {
      series.unit = unit;
      series.unitDate = point.date;
    }
    if (range && point.date >= series.rangeDate) {
      series.range = range;
      series.rangeDate = point.date;
    }
  }

  for (const lab of localLabs) {
    const date = toDateKey(lab.dateAdded);
    const found = getLabPanel(lab);
    if (found) {
      const labels = new Map(allFields(found.template).map((f) => [f.key, f.label] as const));
      for (const entry of found.panel.entries) {
        if (typeof entry.value !== 'number') continue;
        add(
          labels.get(entry.key) ?? entry.key,
          { date, value: entry.value, flag: entry.flag, sourceId: lab.id },
          entry.unit,
          parseReference(entry.reference),
        );
      }
    } else if (lab.mode === 'structured' && lab.numericValue != null) {
      add(
        lab.testName,
        { date, value: lab.numericValue, sourceId: lab.id },
        lab.unit,
        parseReference(lab.referenceRange),
      );
    }
  }

  for (const lab of remoteLabs) {
    if (!lab.testName || lab.numericValue == null) continue;
    add(
      lab.testName,
      { date: toDateKey(lab.recordedAt), value: lab.numericValue, sourceId: lab.id ?? `${lab.testName}-${lab.recordedAt}` },
      lab.unit,
      undefined,
    );
  }

  return [...byKey.values()]
    .map(({ unitDate: _unitDate, rangeDate: _rangeDate, ...series }) => ({
      ...series,
      // Points without their own flag (doctor-entered numbers) are judged against the series' range.
      points: [...series.points]
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .map((p) => (p.flag || !series.range ? p : { ...p, flag: flagFor(p.value, series.range as ReferenceRange) })),
    }))
    .sort((a, b) => b.points.length - a.points.length || a.label.localeCompare(b.label));
}
