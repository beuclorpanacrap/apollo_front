import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Radii, Space, elevationStyle } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';

type StatTileProps = {
  label: string;
  /** The big number / value. `null` renders "Not recorded" in a quieter style. */
  value: string | null;
  unit?: string;
  hint?: string;
  /** Value font size (default 24). Text-like values such as dates use a smaller size so they stay on one line. */
  valueSize?: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Icon-bubble colors (use the pill tokens so contrast is guaranteed). */
  bubbleBg: string;
  bubbleFg: string;
};

/** Label + big value (+ unit / hint) with a circular icon bubble: height, weight, blood type, age… */
export function StatTile({ label, value, unit, hint, valueSize = 24, icon, bubbleBg, bubbleFg }: StatTileProps) {
  const theme = useTheme();
  const isDark = useIsDark();
  const recorded = value != null && value !== '';
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        elevationStyle('card', isDark),
      ]}
      accessible
      accessibilityLabel={`${label}: ${recorded ? `${value}${unit ? ` ${unit}` : ''}` : 'not recorded'}${hint ? `, ${hint}` : ''}`}
    >
      <View style={[styles.bubble, { backgroundColor: bubbleBg }]}>
        <Ionicons name={icon} size={20} color={bubbleFg} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
        {recorded ? (
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: theme.text, fontSize: valueSize, lineHeight: Math.round(valueSize * 1.25) }]}>{value}</Text>
            {unit ? <Text style={[styles.unit, { color: theme.textMuted }]}>{unit}</Text> : null}
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Not recorded</Text>
        )}
        {hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    padding: Space[4],
    borderRadius: Radii.lg,
    borderWidth: 1,
    minWidth: 0,
  },
  bubble: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  label: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  value: { fontSize: 24, lineHeight: 30, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.3 },
  unit: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  empty: { fontSize: 15, lineHeight: 28, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  hint: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular, marginTop: 1 },
});
