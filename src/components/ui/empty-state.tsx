import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Icon on the action button (default `add`). */
  actionIcon?: ComponentProps<typeof Ionicons>['name'];
  /** Description size; the patient default stays 13px, the portal uses 14px. */
  descriptionSize?: number;
  /** `strong` uses `textMuted` (≥ 4.5:1); `default` keeps the patient app's `textSecondary`. */
  tone?: 'default' | 'strong';
  /** Opt-in portal sizing for the action button. */
  portal?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon = 'add',
  descriptionSize = 13,
  tone = 'default',
  portal,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.pillGreenBg }]}>
        <Ionicons name={icon} size={30} color={portal ? theme.accentText : theme.tintStrong} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text
        style={[
          styles.description,
          {
            color: tone === 'strong' ? theme.textMuted : theme.textSecondary,
            fontSize: descriptionSize,
            lineHeight: Math.round(descriptionSize * 1.45),
          },
        ]}
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <Button label={actionLabel} icon={actionIcon} onPress={onAction} portal={portal} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.five, paddingHorizontal: Spacing.four },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontFamily: Fonts.sans.regular,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionWrap: { marginTop: Spacing.four, width: '100%', maxWidth: 280 },
});
