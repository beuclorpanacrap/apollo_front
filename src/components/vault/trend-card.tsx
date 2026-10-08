import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { BrandColors, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TrendSeries } from '@/utils/lab-trends';
import { formatNumber, TrendChart } from './trend-chart';

/** One measured value over time: title, change since the previous result, and the graph. */
export function TrendCard({ series }: { series: TrendSeries }) {
  const theme = useTheme();
  const { points } = series;
  const latest = points[points.length - 1]!;
  const previous = points.length > 1 ? points[points.length - 2]! : undefined;
  const delta = previous ? latest.value - previous.value : undefined;

  return (
    <Card accentColor={BrandColors.clay} style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {series.label}
        </Text>
        <Text style={[styles.count, { color: theme.textTertiary }]}>
          {points.length} {points.length === 1 ? 'result' : 'results'}
        </Text>
      </View>
      {delta !== undefined ? (
        <Text style={[styles.delta, { color: theme.textSecondary }]}>
          {delta === 0 ? 'No change' : `${delta > 0 ? '↑' : '↓'} ${formatNumber(Math.abs(delta))}${series.unit ? ` ${series.unit}` : ''}`}
          {' since the previous result'}
        </Text>
      ) : null}
      <View style={{ marginTop: Spacing.two }}>
        <TrendChart series={series} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  count: { fontSize: 12, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  delta: { fontSize: 12, fontFamily: Fonts.sans.regular, marginTop: 2 },
});
