import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DetailRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  /** Defaults to `textTertiary` (patient app). The portal passes `textMuted` (4.5:1+). */
  labelColor?: string;
  label: string;
  /** Drops the built-in bottom margin so the parent can space rows with `gap` (no trailing space after the last row). */
  compact?: boolean;
  children: ReactNode;
};

export function DetailRow({ icon, iconColor, labelColor, label, compact, children }: DetailRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, compact ? styles.rowCompact : null]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={16} color={iconColor ?? theme.tintStrong} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: labelColor ?? theme.textTertiary }]}>{label}</Text>
        {typeof children === 'string' ? (
          <Text style={[styles.value, { color: theme.text }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, marginBottom: Spacing.four, alignItems: 'flex-start' },
  rowCompact: { marginBottom: 0 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: { flex: 1 },
  label: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600', marginBottom: 3 },
  value: { fontSize: 15, fontFamily: Fonts.sans.regular, lineHeight: 21 },
});
