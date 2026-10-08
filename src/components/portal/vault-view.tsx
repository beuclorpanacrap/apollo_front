import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { UnlockedVault } from '@/api/doctor.api';
import { AddRecordButtons } from '@/components/portal/add-record-buttons';
import { HeroButton, HeroChip, PortalHero } from '@/components/portal/portal-hero';
import {
  ConditionCard,
  EncounterCard,
  LabGroupCard,
  PrescriptionCard,
} from '@/components/portal/record-cards';
import { useSessionCountdown } from '@/components/portal/session-timer';
import { Timeline, TIMELINE_ICONS, type TimelineEntry } from '@/components/portal/timeline';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { TextField } from '@/components/ui/form-field';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Pagination } from '@/components/ui/pagination';
import { TabPills, tabPanelProps, type TabPillItem } from '@/components/ui/tab-pills';
import { Enter } from '@/components/ui/enter';
import { Fonts, Radii, Space } from '@/constants/theme';
import type { RecordKind } from '@/context/clinician-vault-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useMinuteClock } from '@/hooks/use-minute-clock';
import { useTheme } from '@/hooks/use-theme';
import {
  bestDate,
  formatAge,
  formatBloodType,
  formatDate,
  formatGender,
  formatNumber,
  fullName,
  groupLabResults,
  initialsOf,
  sortNewestFirst,
  type Condition,
} from '@/utils/clinician-format';
import { accentForKind, formatConditionType, iconForKind, pillColorsForKind } from '@/utils/vault-display';
import { webProps, webStyle } from '@/utils/web-props';
import { conditionSource } from '@/components/portal/record-cards';

export type VaultTab = 'encounters' | 'prescriptions' | 'labs' | 'conditions' | 'timeline';

const PAGE_SIZE = 6;
const TIMELINE_PAGE_SIZE = 10;
const SEARCH_THRESHOLD = 8;

type Props = {
  vault: UnlockedVault;
  recentIds: ReadonlySet<string>;
  canLab: boolean;
  tab: VaultTab;
  onTabChange: (tab: VaultTab) => void;
  onAdd: (kind: RecordKind) => void;
  onClose: () => void;
  /** Disable Close while a save is in flight. */
  busy: boolean;
};

function Grid({ columns, gap = Space[4], children }: { columns: number; gap?: number; children: ReactNode }) {
  return <View style={webStyle({ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap })}>{children}</View>;
}

function SectionHeading({ title, aside, id }: { title: string; aside?: ReactNode; id?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Text id={id} role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.h2, { color: theme.text }]}>
        {title}
      </Text>
      {aside}
    </View>
  );
}

export function VaultView({ vault, recentIds, canLab, tab, onTabChange, onAdd, onClose, busy }: Props) {
  const theme = useTheme();
  const { width, isPhone } = useBreakpoint();
  const now = useMinuteClock();
  const countdown = useSessionCountdown(vault.sessionExpiresAt);

  const patient = vault.patient;
  const name = fullName(patient);
  const age = formatAge(patient?.dateOfBirth, now);
  const gender = formatGender(patient?.gender);

  // ---- records (sorted newest-first with a deterministic tiebreak) -----------------------------
  const conditions = useMemo(
    () => sortNewestFirst<Condition>(vault.allConditions ?? [...(vault.allergies ?? []), ...(vault.chronicConditions ?? [])]),
    [vault.allConditions, vault.allergies, vault.chronicConditions],
  );
  const allergies = useMemo(() => vault.allergies ?? conditions.filter((c) => c.type === 'ALLERGY'), [vault.allergies, conditions]);
  const chronic = useMemo(() => vault.chronicConditions ?? conditions.filter((c) => c.type === 'CHRONIC_CONDITION'), [vault.chronicConditions, conditions]);
  const encounters = useMemo(() => sortNewestFirst(vault.encounterHistory), [vault.encounterHistory]);
  const prescriptions = useMemo(() => sortNewestFirst(vault.prescriptions), [vault.prescriptions]);
  const labGroups = useMemo(() => groupLabResults(vault.testResults), [vault.testResults]);
  const labCount = vault.testResults?.length ?? 0;

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...encounters.map<TimelineEntry>((e, i) => ({
        id: `enc-${e.id ?? i}`,
        kind: 'encounter',
        date: bestDate(e),
        title: e.diagnosis?.trim() || 'Untitled encounter',
        subtitle: [e.doctorName, e.doctorSpecialty].filter(Boolean).join(' · ') || undefined,
        icon: TIMELINE_ICONS.encounter,
        label: 'Encounter',
      })),
      ...prescriptions.map<TimelineEntry>((p, i) => ({
        id: `rx-${p.id ?? i}`,
        kind: 'prescription',
        date: bestDate(p),
        title: p.medicationName?.trim() || 'Untitled prescription',
        subtitle: [p.dosage, p.doctorName && `Prescribed by ${p.doctorName}`].filter(Boolean).join(' · ') || undefined,
        icon: TIMELINE_ICONS.prescription,
        label: 'Prescription',
      })),
      ...(vault.testResults ?? []).map<TimelineEntry>((r, i) => ({
        id: `lab-${r.id ?? i}`,
        kind: 'lab',
        date: bestDate(r),
        title: r.testName?.trim() || 'Lab result',
        subtitle: `${formatNumber(r.numericValue)}${r.unit ? ` ${r.unit}` : ''}${r.doctorName ? ` · ${r.doctorName}` : ''}`,
        icon: TIMELINE_ICONS.lab,
        label: 'Lab result',
      })),
    ];
    // Same ordering rule as the tabs: best date first, stable by id.
    const time = (e: TimelineEntry) => (e.date ? Date.parse(e.date.length === 10 ? `${e.date}T00:00:00` : e.date) || 0 : 0);
    return entries.sort((a, b) => time(b) - time(a) || a.id.localeCompare(b.id));
  }, [encounters, prescriptions, vault.testResults]);

  // ---- per-tab search + pagination --------------------------------------------------------------
  const [queries, setQueries] = useState<Record<VaultTab, string>>({ encounters: '', prescriptions: '', labs: '', conditions: '', timeline: '' });
  const [pages, setPages] = useState<Record<VaultTab, number>>({ encounters: 1, prescriptions: 1, labs: 1, conditions: 1, timeline: 1 });
  const setQuery = (key: VaultTab, value: string) => {
    setQueries((current) => ({ ...current, [key]: value }));
    setPages((current) => ({ ...current, [key]: 1 }));
  };
  const setPage = (key: VaultTab, value: number) => setPages((current) => ({ ...current, [key]: value }));

  // A record was just added: show the first page of an unfiltered list (newest first) so it is on screen.
  const newest = [...recentIds].pop() ?? null;
  const seenNewest = useRef<string | null>(null);
  useEffect(() => {
    if (!newest || seenNewest.current === newest) return;
    seenNewest.current = newest;
    setQueries({ encounters: '', prescriptions: '', labs: '', conditions: '', timeline: '' });
    setPages({ encounters: 1, prescriptions: 1, labs: 1, conditions: 1, timeline: 1 });
  }, [newest]);

  const includes = (haystack: (string | undefined)[], query: string) => {
    const q = query.trim().toLowerCase();
    return !q || haystack.some((part) => part?.toLowerCase().includes(q));
  };

  const filtered = {
    encounters: encounters.filter((e) => includes([e.diagnosis, e.clinicalNotes, e.doctorName, e.doctorSpecialty], queries.encounters)),
    prescriptions: prescriptions.filter((p) => includes([p.medicationName, p.dosage, p.instructions, p.status, p.doctorName], queries.prescriptions)),
    labs: labGroups.filter((g) => includes([g.name, g.latest.doctorName, g.unit ?? undefined], queries.labs)),
    conditions: conditions.filter((c) => includes([c.title, c.notes, formatConditionType(c.type)], queries.conditions)),
    timeline: timeline.filter((t) => includes([t.title, t.subtitle, t.label], queries.timeline)),
  };

  const tabs: TabPillItem[] = [
    { key: 'conditions', label: 'Conditions & allergies', icon: 'pulse-outline', count: conditions.length },
    { key: 'encounters', label: 'Encounters', icon: 'calendar-outline', count: encounters.length },
    { key: 'prescriptions', label: 'Prescriptions', icon: 'medical-outline', count: prescriptions.length },
    { key: 'labs', label: 'Test results', icon: 'flask-outline', count: labCount },
    { key: 'timeline', label: 'Timeline', icon: 'time-outline' },
  ];

  const totals = { encounters: encounters.length, prescriptions: prescriptions.length, labs: labGroups.length, conditions: conditions.length, timeline: timeline.length };
  const pageSize = tab === 'timeline' ? TIMELINE_PAGE_SIZE : PAGE_SIZE;
  const list = filtered[tab];
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.min(pages[tab], pageCount);
  const start = (page - 1) * pageSize;
  const visible = list.slice(start, start + pageSize);
  const searchable = totals[tab] > SEARCH_THRESHOLD;
  const query = queries[tab];

  // ---- focus + announcements --------------------------------------------------------------------
  const heading = useRef<unknown>(null);
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    (heading.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    // The live region must exist before its text changes to be announced reliably.
    const id = setTimeout(() => setAnnounce('Patient vault unlocked'), 150);
    return () => clearTimeout(id);
  }, []);

  const wide = width >= 900;
  const safetyColumns = wide ? 2 : 1;
  const listColumns = wide ? 2 : 1;
  const patientId = patient?.id;

  const emptyFor: Record<VaultTab, { title: string; description: string; action?: { label: string; onPress: () => void } }> = {
    encounters: {
      title: 'No encounters yet',
      description: 'Document this consultation to start the patient’s encounter history.',
      action: patientId ? { label: 'Add encounter', onPress: () => onAdd('encounter') } : undefined,
    },
    prescriptions: {
      title: 'No prescriptions yet',
      description: 'Prescriptions you issue appear here with their status and validity.',
      action: patientId ? { label: 'Add prescription', onPress: () => onAdd('prescription') } : undefined,
    },
    labs: {
      title: 'No test results yet',
      description: canLab ? 'Record a lab result to see values and trends here.' : 'Lab results recorded by other clinicians appear here.',
      action: patientId && canLab ? { label: 'Add lab result', onPress: () => onAdd('lab') } : undefined,
    },
    conditions: {
      title: 'No conditions recorded',
      description: 'Allergies, chronic conditions and history recorded by the patient or a clinician appear here.',
    },
    timeline: {
      title: 'Nothing on the timeline yet',
      description: 'Encounters, prescriptions and lab results appear here in date order.',
    },
  };
  const emptyIcon: Record<VaultTab, 'calendar-outline' | 'medical-outline' | 'flask-outline' | 'pulse-outline' | 'time-outline'> = {
    encounters: 'calendar-outline',
    prescriptions: 'medical-outline',
    labs: 'flask-outline',
    conditions: 'pulse-outline',
    timeline: 'time-outline',
  };

  const renderItems = () => {
    switch (tab) {
      case 'encounters':
        return (filtered.encounters.slice(start, start + pageSize)).map((record, i) => (
          <EncounterCard key={record.id ?? i} record={record} highlight={!!record.id && recentIds.has(record.id)} />
        ));
      case 'prescriptions':
        return filtered.prescriptions.slice(start, start + pageSize).map((record, i) => (
          <PrescriptionCard key={record.id ?? i} record={record} highlight={!!record.id && recentIds.has(record.id)} encounters={encounters} now={now} />
        ));
      case 'labs':
        return filtered.labs.slice(start, start + pageSize).map((group) => <LabGroupCard key={group.key} group={group} recentIds={recentIds} />);
      case 'conditions':
        return filtered.conditions.slice(start, start + pageSize).map((record, i) => <ConditionCard key={record.id ?? i} record={record} />);
      default:
        return null;
    }
  };

  const tabLabel = tabs.find((item) => item.key === tab)?.label ?? '';

  return (
    <View style={styles.page}>
      <div role="status" aria-live="polite" className="ap-visually-hidden">
        {announce}
      </div>
      <div role="status" aria-live="polite" className="ap-visually-hidden">
        {countdown.announcement ?? ''}
      </div>

      {/* ---------------------------------------------------------------- identity hero */}
      <Enter kind="rise">
        <PortalHero
          eyebrow="Patient vault"
          eyebrowIcon="lock-open-outline"
          title={name}
          titleRef={(node) => {
            heading.current = node;
          }}
          leading={
            <View style={[styles.avatar, { backgroundColor: theme.heroChipBg, borderColor: theme.heroGlow }]} aria-hidden>
              <Text style={[styles.avatarText, { color: theme.heroText }]}>{initialsOf(name, 'P')}</Text>
            </View>
          }
          chips={
            <>
              {age ? <HeroChip icon="person-outline" label={age} /> : null}
              {gender ? <HeroChip icon="male-female-outline" label={gender} /> : null}
              <HeroChip icon="shield-checkmark-outline" label="Opened with patient’s PIN" />
            </>
          }
          aside={
            <>
              <View style={[styles.session, countdown.urgent ? { backgroundColor: theme.pillMarigoldBg } : { backgroundColor: theme.heroChipBg }]}>
                <Text style={[styles.sessionLabel, { color: countdown.urgent ? theme.pillMarigoldText : theme.heroChipText }]}>
                  {countdown.remainingMs > 0 ? `${countdown.label} left` : 'Session expired'}
                </Text>
                <Text style={[styles.sessionSub, { color: countdown.urgent ? theme.pillMarigoldText : theme.heroTextMuted }]}>{countdown.expiryText}</Text>
              </View>
              <HeroButton label="Close patient vault" icon="close-circle-outline" onPress={onClose} disabled={busy} />
            </>
          }
        />
      </Enter>

      {/* ---------------------------------------------------------------- patient summary (safety first, then basics) */}
      <Enter kind="rise" delay={40}>
        <Card variant="portal" style={styles.summary}>
          <Grid columns={safetyColumns} gap={Space[3]}>
            <SafetyBox
              kind="allergy"
              title="Allergies"
              items={allergies}
              empty="No allergies recorded."
              hint="Absence of a record isn’t confirmation. Ask the patient before prescribing."
            />
            <SafetyBox kind="chronic" title="Chronic conditions" items={chronic} empty="No chronic conditions recorded." />
          </Grid>

          <View style={styles.factRow}>
            <Badge
              size="md"
              icon="water-outline"
              label={formatBloodType(patient?.bloodType) ? `Blood type ${formatBloodType(patient?.bloodType)}` : 'Blood type not recorded'}
              bg={theme.pillGreenBg}
              fg={theme.pillGreenText}
            />
            {gender ? <Badge size="md" icon="person-outline" label={gender} bg={theme.pillGreenBg} fg={theme.pillGreenText} /> : null}
          </View>

          {age || patient?.dateOfBirth ? (
            <View style={styles.bornRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
              <Text style={[styles.bornText, { color: theme.text }]}>
                {[age ? `${age} old` : null, patient?.dateOfBirth ? `Born ${formatDate(patient.dateOfBirth)}` : null].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
          ) : null}

          <Grid columns={2} gap={Space[3]}>
            <MiniStat label="Height" value={patient?.heightCm != null ? formatNumber(patient.heightCm) : null} unit="cm" icon="resize-outline" />
            <MiniStat label="Weight" value={patient?.weightKg != null ? formatNumber(patient.weightKg) : null} unit="kg" icon="barbell-outline" />
          </Grid>
        </Card>
      </Enter>

      {/* ---------------------------------------------------------------- records */}
      <Enter kind="rise" delay={120}>
        <SectionHeading
          title="Records"
          aside={isPhone ? undefined : <AddRecordButtons canLab={canLab} canAdd={!!patientId} onAdd={onAdd} disabled={busy} />}
        />
        {isPhone ? (
          <View style={{ marginBottom: Space[4] }}>
            <AddRecordButtons canLab={canLab} canAdd={!!patientId} onAdd={onAdd} disabled={busy} stacked />
          </View>
        ) : null}
        {!patientId ? (
          <View style={{ marginBottom: Space[4] }}>
            <InlineAlert tone="warning">This vault response has no patient id, so new records can’t be added from here.</InlineAlert>
          </View>
        ) : null}

        <TabPills tabs={tabs} value={tab} onChange={(key) => onTabChange(key as VaultTab)} accessibilityLabel="Patient records" idPrefix="vault" portal />

        <View {...tabPanelProps('vault', tab)} {...webProps({ tabIndex: 0 })} style={[styles.panel, webStyle({ outlineStyle: 'none' })]}>
          {searchable ? (
            <View style={styles.search}>
              <TextField
                label={`Search ${tabLabel.toLowerCase()}`}
                hideLabel
                optional
                type="search"
                leadingIcon="search"
                placeholder={`Search ${tabLabel.toLowerCase()}`}
                value={query}
                onChangeText={(value) => setQuery(tab, value)}
                onClear={() => setQuery(tab, '')}
              />
            </View>
          ) : null}

          {list.length === 0 ? (
            <Card variant="portal">
              {query.trim() ? (
                <EmptyState
                  portal
                  tone="strong"
                  descriptionSize={14}
                  icon="search"
                  title="No matches"
                  description={`Nothing in ${tabLabel.toLowerCase()} matches “${query.trim()}”.`}
                  actionLabel="Clear search"
                  actionIcon="close"
                  onAction={() => setQuery(tab, '')}
                />
              ) : (
                <EmptyState
                  portal
                  tone="strong"
                  descriptionSize={14}
                  icon={emptyIcon[tab]}
                  title={emptyFor[tab].title}
                  description={emptyFor[tab].description}
                  actionLabel={emptyFor[tab].action?.label}
                  onAction={emptyFor[tab].action?.onPress}
                />
              )}
            </Card>
          ) : tab === 'timeline' ? (
            <Enter key={`${tab}-${page}`} kind="fade">
              <Timeline entries={visible as TimelineEntry[]} />
            </Enter>
          ) : (
            <Enter key={`${tab}-${page}-${query}`} kind="fade">
              <Grid columns={listColumns} gap={Space[3]}>
                {renderItems()}
              </Grid>
            </Enter>
          )}

          <Pagination
            variant="portal"
            page={page}
            pageCount={pageCount}
            onPageChange={(next) => setPage(tab, next)}
          />
        </View>
      </Enter>
    </View>
  );
}

/** A tinted box of chips (one per allergy / chronic condition). Free-text notes stay visible next to the name. */
function SafetyBox({
  kind,
  title,
  items,
  empty,
  hint,
}: {
  kind: 'allergy' | 'chronic';
  title: string;
  items: readonly Condition[];
  empty: string;
  hint?: string;
}) {
  const theme = useTheme();
  const type = kind === 'allergy' ? 'ALLERGY' : 'CHRONIC_CONDITION';
  const colors = pillColorsForKind('CONDITION', theme, type);
  const accent = accentForKind('CONDITION', theme, type);
  return (
    <View style={[styles.safetyBox, { backgroundColor: colors.bg, borderColor: accent }]}>
      <View style={styles.safetyBoxHeader}>
        <Ionicons name={iconForKind('CONDITION', type)} size={16} color={colors.fg} />
        <Text role="heading" {...webProps({ 'aria-level': 3 })} style={[styles.h3, { color: colors.fg }]}>
          {title}
        </Text>
      </View>
      {items.length === 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={[styles.safetyEmpty, { color: colors.fg }]}>{empty}</Text>
          {hint ? <Text style={[styles.safetyHint, { color: colors.fg }]}>{hint}</Text> : null}
        </View>
      ) : (
        <View role="list" style={styles.chips}>
          {items.map((item, index) => {
            const notes = item.notes?.trim();
            return (
              <View key={item.id ?? index} role="listitem" style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {item.title?.trim() || formatConditionType(item.type)}
                  {notes ? <Text style={[styles.chipNotes, { color: theme.textMuted }]}>{`  ·  ${notes}`}</Text> : null}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Flat label + value tile (height, weight). */
function MiniStat({ label, value, unit, icon }: { label: string; value: string | null; unit?: string; icon: ComponentProps<typeof Ionicons>['name'] }) {
  const theme = useTheme();
  const recorded = value != null && value !== '';
  return (
    <View
      style={[styles.miniStat, { backgroundColor: theme.surfaceMuted }]}
      accessible
      accessibilityLabel={`${label}: ${recorded ? `${value}${unit ? ` ${unit}` : ''}` : 'not recorded'}`}
    >
      <View style={[styles.miniBubble, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={icon} size={18} color={theme.textMuted} />
      </View>
      <View style={{ minWidth: 0 }}>
        <Text style={[styles.miniLabel, { color: theme.textMuted }]}>{label}</Text>
        {recorded ? (
          <Text style={[styles.miniValue, { color: theme.text }]}>
            {value}
            {unit ? <Text style={[styles.miniUnit, { color: theme.textMuted }]}>{` ${unit}`}</Text> : null}
          </Text>
        ) : (
          <Text style={[styles.miniEmpty, { color: theme.textMuted }]}>Not recorded</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space[5] },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Space[3], marginBottom: Space[3] },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.3 },
  h3: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: 22, lineHeight: 28, fontFamily: Fonts.display, fontWeight: '800' },
  session: { borderRadius: Radii.md, paddingVertical: 10, paddingHorizontal: 14, gap: 1 },
  sessionLabel: { fontSize: 15, lineHeight: 20, fontFamily: Fonts.sans.bold, fontWeight: '700', fontVariant: ['tabular-nums'] },
  sessionSub: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular },
  panel: { marginTop: Space[4], gap: Space[3] },
  search: { maxWidth: 420 },
  summary: { gap: Space[4], padding: Space[5] },
  safetyBox: { borderWidth: 1.5, borderRadius: Radii.lg, padding: Space[4], gap: Space[3], minWidth: 0 },
  safetyBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  safetyEmpty: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  safetyHint: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  chip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, maxWidth: '100%' },
  chipText: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  chipNotes: { fontFamily: Fonts.sans.regular, fontWeight: '400' },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  bornRow: { flexDirection: 'row', alignItems: 'center', gap: Space[2] },
  bornText: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: Space[3], borderRadius: Radii.md, paddingVertical: Space[3], paddingHorizontal: Space[4], minWidth: 0 },
  miniBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  miniLabel: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  miniValue: { fontSize: 17, lineHeight: 22, fontFamily: Fonts.sans.bold, fontWeight: '700', fontVariant: ['tabular-nums'] },
  miniUnit: { fontSize: 13, lineHeight: 22, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  miniEmpty: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans.medium, fontWeight: '500' },
});
