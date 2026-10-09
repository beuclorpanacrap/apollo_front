import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/badge';
import { Fonts, Radii, Space } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';
import { monthLabel, parseDateInput } from '@/utils/clinician-format';
import { accentForKind, iconForKind, pillColorsForKind } from '@/utils/vault-display';
import { webProps } from '@/utils/web-props';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type TimelineEntry = {
  id: string;
  kind: 'encounter' | 'prescription' | 'lab';
  /** ISO date used for ordering and the date column. */
  date?: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  label: string;
};

/**
 * Encounters, prescriptions and lab results interleaved by date, newest first and grouped by month.
 * Read-only: each entry is a compact summary; the full record lives in its own tab.
 */
export function Timeline({ entries }: { entries: readonly TimelineEntry[] }) {
  const theme = useTheme();
  const { isPhone } = useBreakpoint();

  const groups: { month: string; items: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const month = monthLabel(entry.date);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(entry);
    else groups.push({ month, items: [entry] });
  }

  return (
    <View style={styles.wrap}>
      {groups.map((group) => (
        <View key={group.month} role="group" aria-label={group.month}>
          <Text style={[styles.month, { color: theme.textMuted }]} role="heading" {...webProps({ 'aria-level': 3 })}>
            {group.month}
          </Text>
          {group.items.map((entry, index) => {
            const kind = entry.kind === 'encounter' ? null : entry.kind === 'prescription' ? 'PRESCRIPTION' : 'LAB_RESULT';
            const accent = kind ? accentForKind(kind, theme) : theme.tintStrong;
            const colors = kind ? pillColorsForKind(kind, theme) : { bg: theme.pillGreenBg, fg: theme.pillGreenText };
            const date = parseDateInput(entry.date);
            const previous = index > 0 ? parseDateInput(group.items[index - 1].date) : null;
            // Several entries on one day share a single date label.
            const sameDay = !!date && !!previous && date.toDateString() === previous.toDateString();
            const last = index === group.items.length - 1;
            return (
              <View key={entry.id} style={styles.row}>
                <View style={[styles.dateCol, { width: isPhone ? 44 : 56 }]}>
                  {sameDay ? null : (
                    <>
                      <Text style={[styles.day, { color: theme.text }]}>{date ? date.getDate() : '–'}</Text>
                      <Text style={[styles.dayMonth, { color: theme.textMuted }]}>
                        {date ? date.toLocaleDateString(undefined, { month: 'short' }) : ''}
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.rail} aria-hidden>
                  <View style={[styles.line, { backgroundColor: theme.border }, last && styles.lineLast]} />
                  <View style={[styles.dot, { backgroundColor: accent, borderColor: theme.background }]} />
                </View>
                <View style={[styles.item, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <View style={[styles.itemIcon, { backgroundColor: colors.bg }]}>
                    <Ionicons name={entry.icon} size={16} color={colors.fg} />
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemTitle, { color: theme.text }]}>{entry.title}</Text>
                    {entry.subtitle ? <Text style={[styles.itemSub, { color: theme.textMuted }]}>{entry.subtitle}</Text> : null}
                  </View>
                  <Badge size="md" style={{ alignSelf: 'center' }} label={entry.label} bg={colors.bg} fg={colors.fg} />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const TIMELINE_ICONS = {
  encounter: 'calendar-outline' as IconName,
  prescription: iconForKind('PRESCRIPTION'),
  lab: iconForKind('LAB_RESULT'),
};

const styles = StyleSheet.create({
  wrap: { gap: Space[5] },
  month: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.semiBold, fontWeight: '600', marginBottom: Space[3] },
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 72 },
  dateCol: { alignItems: 'center', paddingTop: 6 },
  day: { fontSize: 20, lineHeight: 24, fontFamily: Fonts.sans.bold, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dayMonth: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  rail: { width: 28, alignItems: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  lineLast: { bottom: '50%' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: 12 },
  item: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    padding: Space[3],
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Space[3],
    flexWrap: 'wrap',
  },
  itemIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, minWidth: 140 },
  itemTitle: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  itemSub: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular },
});
