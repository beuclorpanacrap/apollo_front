import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge, IconBubble } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { pressState, useInteractive } from '@/components/ui/interactive';
import { Sparkline } from '@/components/ui/sparkline';
import { allFields } from '@/components/evaluate';
import type { Flag } from '@/components/types';
import { BrandColors, Fonts, Radii, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  bestDate,
  formatDate,
  formatDateTime,
  formatNumber,
  isPrescriptionExpired,
  labTrendSummary,
  type Condition,
  type Encounter,
  type LabGroup,
  type LabResult,
  type Prescription,
} from '@/utils/clinician-format';
import type { RemoteLabGroup } from '@/utils/remote-panels';
import { accentForKind, formatConditionType, iconForKind, pillColorsForKind } from '@/utils/vault-display';
import { webProps } from '@/utils/web-props';

type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------

/** Wraps a card so a just-added record gets a soft green flash (global.css `.ap-flash`, 2.5s, off under reduced motion). */
export function HighlightFrame({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <div className="ap-flash" style={{ borderRadius: Radii.xl, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {children}
    </div>
  );
}

const COLLAPSED_LINES = 4;
const LONG_TEXT = 280;

/**
 * Clinical text is never cut off: line breaks are preserved and the whole string stays in the DOM.
 * Text over ~280 characters is collapsed to four lines behind a "Show more" button
 * (`aria-expanded`) — and the button only appears if the text really overflows at the current width.
 */
export function ExpandableText({ text, label }: { text: string; label: string }) {
  const theme = useTheme();
  const fx = useInteractive();
  const long = text.length > LONG_TEXT || text.split('\n').length > COLLAPSED_LINES + 1;
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !long || expanded) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [long, expanded, text]);

  const collapsed = long && !expanded;
  return (
    <View>
      <div
        ref={box}
        style={{
          fontFamily: Fonts.sans.regular,
          fontSize: 14,
          lineHeight: '22px',
          color: theme.text,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          ...(collapsed
            ? { display: '-webkit-box', WebkitLineClamp: COLLAPSED_LINES, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
            : {}),
        }}
      >
        {text}
      </div>
      {long && (overflowing || expanded) ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Show less' : 'Show more'}: ${label}`}
          aria-expanded={expanded}
          style={(state) => [styles.textToggle, fx.ring(theme, pressState(state))]}
        >
          <Text style={[styles.textToggleLabel, { color: theme.accentText }]}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentText} />
        </Pressable>
      ) : null}
    </View>
  );
}

function CardHeader({
  icon,
  bubbleBg,
  bubbleFg,
  title,
  meta,
  trailing,
}: {
  icon: IconName;
  bubbleBg: string;
  bubbleFg: string;
  title: string;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <IconBubble icon={icon} bg={bubbleBg} fg={bubbleFg} size={40} />
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: theme.text }]} role="heading" {...webProps({ 'aria-level': 3 })}>
          {title}
        </Text>
        {meta ? <View style={styles.metaWrap}>{meta}</View> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

/** One metadata line: entries are joined with "·" separators (the dots are decorative, hidden from assistive tech). */
function MetaLine({ parts }: { parts: (string | false | null | undefined)[] }) {
  const theme = useTheme();
  const items = parts.filter((part): part is string => !!part);
  if (items.length === 0) return null;
  return (
    <Text style={[styles.meta, { color: theme.textMuted }]}>
      {items.map((part, index) => (
        <Text key={index}>
          {index > 0 ? <Text aria-hidden>{'  ·  '}</Text> : null}
          {part}
        </Text>
      ))}
    </Text>
  );
}

function Footer({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      <Text style={[styles.footerText, { color: theme.textMuted }]}>{children}</Text>
    </View>
  );
}

function NewBadge() {
  const theme = useTheme();
  return <Badge size="md" label="Just added" icon="sparkles-outline" bg={theme.pillGreenBg} fg={theme.pillGreenText} />;
}

const attribution = (name?: string, specialty?: string) => [name, specialty].filter(Boolean).join(' · ');

// ---------------------------------------------------------------------------------------------
// Encounter
// ---------------------------------------------------------------------------------------------

export function EncounterCard({ record, highlight }: { record: Encounter; highlight: boolean }) {
  const theme = useTheme();
  const by = attribution(record.doctorName, record.doctorSpecialty);
  return (
    <HighlightFrame active={highlight}>
      <Card variant="portal" accentColor={theme.tintStrong} style={styles.card}>
        <CardHeader
          icon="calendar-outline"
          bubbleBg={theme.pillGreenBg}
          bubbleFg={theme.accentText}
          title={record.diagnosis?.trim() || 'Untitled encounter'}
          meta={<MetaLine parts={[formatDate(record.encounterDate), by]} />}
          trailing={highlight ? <NewBadge /> : null}
        />
        {record.clinicalNotes?.trim() ? (
          <ExpandableText text={record.clinicalNotes} label={`clinical notes for ${record.diagnosis ?? 'encounter'}`} />
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>No clinical notes were recorded.</Text>
        )}
        {record.createdAt ? <Footer>Recorded {formatDateTime(record.createdAt)}</Footer> : null}
      </Card>
    </HighlightFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// Prescription
// ---------------------------------------------------------------------------------------------

export function PrescriptionCard({
  record,
  highlight,
  encounters,
  now,
}: {
  record: Prescription;
  highlight: boolean;
  encounters: readonly Encounter[];
  now: Date;
}) {
  const theme = useTheme();
  const colors = pillColorsForKind('PRESCRIPTION', theme);
  const expired = record.status === 'ACTIVE' && isPrescriptionExpired(record, now);
  const linked = record.encounterId ? encounters.find((encounter) => encounter.id === record.encounterId) : undefined;
  const by = record.doctorName ? `Prescribed by ${record.doctorName}` : '';

  const statusBadge =
    record.status === 'ACTIVE' ? (
      <Badge size="md" label="Active" icon="checkmark-circle" bg={theme.pillGreenBg} fg={theme.pillGreenText} />
    ) : record.status === 'FULFILLED' ? (
      <Badge size="md" label="Fulfilled" icon="checkmark-done" bg={theme.surfaceMuted} fg={theme.textMuted} />
    ) : record.status === 'CANCELLED' ? (
      <Badge size="md" label="Cancelled" icon="close-circle" bg={theme.pillCoralBg} fg={theme.pillCoralText} />
    ) : null;

  return (
    <HighlightFrame active={highlight}>
      <Card variant="portal" accentColor={accentForKind('PRESCRIPTION', theme)} style={styles.card}>
        <CardHeader
          icon={iconForKind('PRESCRIPTION')}
          bubbleBg={colors.bg}
          bubbleFg={colors.fg}
          title={record.medicationName?.trim() || 'Untitled prescription'}
          meta={<MetaLine parts={[by, record.issuedAt ? `Issued ${formatDate(record.issuedAt)}` : '']} />}
          trailing={
            <View style={styles.badgeStack}>
              {highlight ? <NewBadge /> : null}
              {statusBadge}
              {expired ? <Badge size="md" label="Expired" icon="time" bg={theme.pillMarigoldBg} fg={theme.pillMarigoldText} /> : null}
            </View>
          }
        />

        <View style={styles.facts}>
          {record.dosage ? <Fact label="Dosage" value={record.dosage} /> : null}
          {record.expiresAt ? <Fact label="Valid until" value={formatDateTime(record.expiresAt)} /> : null}
        </View>

        {record.instructions?.trim() ? (
          <ExpandableText text={record.instructions} label={`instructions for ${record.medicationName ?? 'prescription'}`} />
        ) : null}

        {linked ? (
          <Footer>
            From encounter “{linked.diagnosis?.trim() || 'Untitled encounter'}”, {formatDate(linked.encounterDate)}
          </Footer>
        ) : null}
      </Card>
    </HighlightFrame>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: theme.surfaceMuted }]}>
      <Text style={[styles.factLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Lab results (grouped per test, with a trend line when comparable)
// ---------------------------------------------------------------------------------------------

export function LabGroupCard({ group, recentIds }: { group: LabGroup; recentIds: ReadonlySet<string> }) {
  const theme = useTheme();
  const fx = useInteractive();
  const colors = pillColorsForKind('LAB_RESULT', theme);
  const [open, setOpen] = useState(false);
  const { latest } = group;
  const highlight = group.results.some((result) => !!result.id && recentIds.has(result.id));
  const count = group.results.length;
  const trend = count >= 2 && !group.mixedUnits;
  const history = [...group.results].reverse();

  return (
    <HighlightFrame active={highlight}>
      <Card variant="portal" accentColor={accentForKind('LAB_RESULT', theme)} style={styles.card}>
        <CardHeader
          icon={iconForKind('LAB_RESULT')}
          bubbleBg={colors.bg}
          bubbleFg={colors.fg}
          title={group.name}
          meta={<MetaLine parts={[formatDate(bestDate(latest)), latest.doctorName]} />}
          trailing={highlight ? <NewBadge /> : null}
        />

        <View style={styles.labBody}>
          <View style={styles.labValueBlock}>
            <Text style={[styles.labCaption, { color: theme.textMuted }]}>{count > 1 ? 'Latest result' : 'Result'}</Text>
            <View style={styles.labValueRow}>
              <Text style={[styles.labValue, { color: theme.text }]}>{formatNumber(latest.numericValue)}</Text>
              {latest.unit ? <Text style={[styles.labUnit, { color: theme.textMuted }]}>{latest.unit}</Text> : null}
            </View>
          </View>
          {trend ? (
            <View style={styles.sparkWrap}>
              <Sparkline
                width={176}
                height={48}
                values={group.results.map((result) => result.numericValue ?? 0)}
                color={BrandColors.clay}
                background={theme.backgroundElement}
                label={labTrendSummary(group)}
              />
              <Text style={[styles.sparkCaption, { color: theme.textMuted }]}>{count} results</Text>
            </View>
          ) : null}
        </View>

        {count > 1 && group.mixedUnits ? (
          <Text style={[styles.note, { color: theme.textMuted }]}>
            Results for this test use different units, so no trend is drawn. Compare them in the history below.
          </Text>
        ) : null}

        {count > 1 ? (
          <>
            <Pressable
              onPress={() => setOpen((value) => !value)}
              accessibilityRole="button"
              aria-expanded={open}
              accessibilityLabel={`${open ? 'Hide' : 'Show'} history for ${group.name}, ${count} results`}
              style={(state) => [styles.textToggle, fx.ring(theme, pressState(state))]}
            >
              <Text style={[styles.textToggleLabel, { color: theme.accentText }]}>{open ? 'Hide history' : `Show history (${count})`}</Text>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentText} />
            </Pressable>
            {open ? (
              <View style={[styles.history, { borderTopColor: theme.border }]}>
                {history.map((result) => (
                  <LabHistoryRow key={result.id ?? `${result.recordedAt}-${result.numericValue}`} result={result} isLatest={result === latest} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Card>
    </HighlightFrame>
  );
}

function LabHistoryRow({ result, isLatest }: { result: LabResult; isLatest: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.historyRow}>
      <Text style={[styles.historyDate, { color: theme.textMuted }]}>{formatDateTime(bestDate(result))}</Text>
      <Text style={[styles.historyValue, { color: theme.text }]}>
        {formatNumber(result.numericValue)}
        {result.unit ? ` ${result.unit}` : ''}
      </Text>
      <Text style={[styles.historyBy, { color: theme.textMuted }]}>{isLatest ? 'Latest' : result.doctorName ?? ''}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------
// Lab panels: several values entered together from one template (e.g. a blood count)
// ---------------------------------------------------------------------------------------------

const FLAG_LABEL: Partial<Record<Flag, string>> = {
  low: 'Low',
  high: 'High',
  'critical-low': 'Critical low',
  'critical-high': 'Critical high',
  abnormal: 'Abnormal',
};

export function LabPanelCard({ panel, recentIds }: { panel: RemoteLabGroup; recentIds: ReadonlySet<string> }) {
  const theme = useTheme();
  const colors = pillColorsForKind('LAB_RESULT', theme);
  const highlight = panel.recordIds.some((id) => recentIds.has(id));
  // Template order, only the values that were actually entered.
  const rows = allFields(panel.template).flatMap((field) => {
    const entry = panel.entries.find((candidate) => candidate.key === field.key);
    return entry ? [{ field, entry }] : [];
  });

  return (
    <HighlightFrame active={highlight}>
      <Card variant="portal" accentColor={accentForKind('LAB_RESULT', theme)} style={styles.card}>
        <CardHeader
          icon={iconForKind('LAB_RESULT')}
          bubbleBg={colors.bg}
          bubbleFg={colors.fg}
          title={panel.template.name}
          meta={<MetaLine parts={[formatDate(panel.recordedAt), panel.doctorName]} />}
          trailing={highlight ? <NewBadge /> : null}
        />
        <View style={styles.panelRows} role="list">
          {rows.map(({ field, entry }, index) => {
            const flagLabel = entry.flag ? FLAG_LABEL[entry.flag] : undefined;
            const critical = entry.flag === 'critical-low' || entry.flag === 'critical-high';
            return (
              <View
                key={entry.key}
                role="listitem"
                style={[styles.panelRow, index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : null]}
              >
                <Text style={[styles.panelLabel, { color: theme.text }]}>{field.label}</Text>
                <View style={styles.panelValueCell}>
                  <Text style={[styles.panelValue, { color: theme.text }]}>
                    {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
                    {entry.unit ? ` ${entry.unit}` : ''}
                  </Text>
                  {flagLabel ? (
                    <Badge
                      size="md"
                      label={flagLabel}
                      bg={critical ? theme.pillCoralBg : theme.pillMarigoldBg}
                      fg={critical ? theme.pillCoralText : theme.pillMarigoldText}
                    />
                  ) : null}
                </View>
                {entry.reference ? (
                  <Text style={[styles.panelRef, { color: theme.textMuted }]}>Ref {entry.reference}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>
    </HighlightFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------------------------

/** Only self-reported entries get a chip — that's the one a clinician should weigh differently. "Verified" /
 *  "Clinician-entered" were decoration on every other card, so they are not shown. */
export function conditionSource(source: Condition['sourceType'], theme: ReturnType<typeof useTheme>) {
  if (source === 'PATIENT_DECLARED') {
    return { label: 'Patient-reported', icon: 'person-outline' as const, bg: theme.surfaceMuted, fg: theme.textMuted };
  }
  return null;
}

export function ConditionCard({ record }: { record: Condition }) {
  const theme = useTheme();
  const colors = pillColorsForKind('CONDITION', theme, record.type);
  const source = conditionSource(record.sourceType, theme);
  return (
    <Card variant="portal" accentColor={accentForKind('CONDITION', theme, record.type)} style={styles.compactCard}>
      <CardHeader
        icon={iconForKind('CONDITION', record.type)}
        bubbleBg={colors.bg}
        bubbleFg={colors.fg}
        title={record.title?.trim() || 'Untitled condition'}
        meta={record.dateRecorded ? <MetaLine parts={[formatDate(record.dateRecorded)]} /> : undefined}
      />
      <View style={styles.chipRow}>
        <Badge size="md" label={formatConditionType(record.type)} bg={colors.bg} fg={colors.fg} />
        {source ? <Badge size="md" label={source.label} icon={source.icon} bg={source.bg} fg={source.fg} /> : null}
      </View>
      {record.notes?.trim() ? <ExpandableText text={record.notes} label={`notes for ${record.title ?? 'condition'}`} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Space[3], padding: Space[5] },
  compactCard: { gap: Space[3], padding: Space[4] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[3] },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.1 },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  meta: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans.regular },
  trailing: { flexShrink: 0, alignItems: 'flex-end', maxWidth: '45%' },
  badgeStack: { gap: 6, alignItems: 'flex-end' },
  empty: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans.regular, fontStyle: 'italic' },
  footer: { borderTopWidth: 1, paddingTop: Space[3], marginTop: Space[1] },
  footerText: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  fact: { borderRadius: Radii.sm + 2, paddingVertical: 8, paddingHorizontal: 12, minWidth: 96 },
  factLabel: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  factValue: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  textToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, marginTop: 2, borderRadius: 8 },
  textToggleLabel: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  labBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Space[4], flexWrap: 'wrap' },
  labValueBlock: { gap: 0 },
  labCaption: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  labValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  labValue: { fontSize: 32, lineHeight: 38, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  labUnit: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  panelRows: { marginTop: Space[1] },
  panelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space[2], paddingVertical: Space[2] },
  panelLabel: { flex: 1.4, minWidth: 140, fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  panelValueCell: { flex: 1.2, minWidth: 130, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space[2] },
  panelValue: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontVariant: ['tabular-nums'] },
  panelRef: { flex: 1, minWidth: 100, fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular, textAlign: 'right' },
  sparkWrap: { alignItems: 'flex-end', gap: 2 },
  sparkCaption: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.regular },
  note: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans.regular },
  history: { borderTopWidth: 1, paddingTop: Space[2], marginTop: Space[1] },
  historyRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space[3], paddingVertical: 6, flexWrap: 'wrap' },
  historyDate: { flex: 1.3, minWidth: 140, fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular },
  historyValue: { flex: 1, minWidth: 90, fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontVariant: ['tabular-nums'] },
  historyBy: { flex: 1, minWidth: 80, fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular, textAlign: 'right' },
});
