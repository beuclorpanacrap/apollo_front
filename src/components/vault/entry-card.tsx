import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Badge, IconBubble } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  accentForKind,
  iconForKind,
  pillColorsForKind,
  sourceBadgeColors,
  sourceIcon,
  sourceLabel,
  type VaultDisplayEntry,
} from '@/utils/vault-display';

type EntryCardProps = {
  entry: VaultDisplayEntry;
  showKindLabel?: boolean;
};

/** Tapping any entry — yours or your doctor's — opens its View screen.
 *  Edit/Delete live there, gated on whether it's yours to change. */
export function EntryCard({ entry, showKindLabel = false }: EntryCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const accent = accentForKind(entry.kind, theme, entry.conditionType);
  const icon = iconForKind(entry.kind, entry.conditionType);
  const bubbleColors = pillColorsForKind(entry.kind, theme, entry.conditionType);
  const sourceColors = sourceBadgeColors(entry.source, theme);

  return (
    <Card onPress={() => router.push(entry.viewHref as never)} accentColor={accent} style={styles.card}>
      <View style={styles.row}>
        <IconBubble icon={icon} bg={bubbleColors.bg} fg={bubbleColors.fg} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {entry.title}
            </Text>
            <Text style={[styles.date, { color: theme.textTertiary }]}>{entry.dateLabel}</Text>
          </View>
          {showKindLabel && entry.kind !== 'CONDITION' ? (
            <Text style={[styles.kindLabel, { color: accent }]}>
              {entry.kind === 'PRESCRIPTION' ? 'Prescription' : 'Test result'}
            </Text>
          ) : null}
          {entry.subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
              {entry.subtitle}
            </Text>
          ) : null}
          <View style={styles.footerRow}>
            <View style={styles.footerBadges}>
              <Badge
                label={sourceLabel(entry.source)}
                bg={sourceColors.bg}
                fg={sourceColors.fg}
                icon={sourceIcon(entry.source)}
              />
              {entry.kind === 'CONDITION' && entry.conditionStatus === 'RESOLVED' ? (
                <Badge label="Resolved" bg={theme.surfaceMuted} fg={theme.textSecondary} icon="checkmark-circle" />
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.three },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  kindLabel: { fontSize: 10, fontFamily: Fonts.sans.semiBold, fontWeight: '600', letterSpacing: 0.3, marginTop: 4 },
  date: { fontSize: 11, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  subtitle: { fontSize: 13, fontFamily: Fonts.sans.regular, marginTop: 3, lineHeight: 18 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
});
