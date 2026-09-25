import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DetailRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  children: ReactNode;
};

export function DetailRow({ icon, iconColor, label, children }: DetailRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={16} color={iconColor ?? theme.tintStrong} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.textTertiary }]}>{label}</Text>
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
