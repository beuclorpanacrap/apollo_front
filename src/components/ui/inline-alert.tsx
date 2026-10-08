import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Radii, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pressState, useInteractive } from './interactive';

export type AlertTone = 'success' | 'error' | 'warning' | 'info';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TONE_ICON: Record<AlertTone, IconName> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

/** Colors for a tone — pill tokens only, so every pair already clears 4.5:1 in both modes. */
export function useAlertColors(tone: AlertTone) {
  const theme = useTheme();
  switch (tone) {
    case 'success':
      return { bg: theme.pillGreenBg, fg: theme.pillGreenText, accent: theme.tintStrong };
    case 'error':
      return { bg: theme.dangerBg, fg: theme.dangerText, accent: theme.dangerText };
    case 'warning':
      return { bg: theme.pillMarigoldBg, fg: theme.pillMarigoldText, accent: theme.pillMarigoldText };
    default:
      return { bg: theme.surfaceMuted, fg: theme.text, accent: theme.accentText };
  }
}

export { TONE_ICON };

type InlineAlertProps = {
  tone: AlertTone;
  title?: string;
  /** Plain text or richer content. */
  children: ReactNode;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
};

/**
 * Icon + text status block (never color alone). Errors are `role="alert"` (announced immediately);
 * success / info / warning use a polite live region.
 */
export function InlineAlert({ tone, title, children, action, onDismiss }: InlineAlertProps) {
  const theme = useTheme();
  const fx = useInteractive();
  const colors = useAlertColors(tone);

  return (
    <View
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.box, { backgroundColor: colors.bg, borderColor: colors.accent }]}
    >
      <Ionicons name={TONE_ICON[tone]} size={20} color={colors.accent} style={styles.icon} />
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: colors.fg }]}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={[styles.text, { color: colors.fg }]}>{children}</Text>
        ) : (
          children
        )}
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            style={(state) => [styles.action, fx.ring(theme, pressState(state))]}
          >
            <Text style={[styles.actionLabel, { color: colors.fg }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={(state) => [styles.dismiss, fx.ring(theme, pressState(state))]}
        >
          <Ionicons name="close" size={18} color={colors.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[3],
    padding: Space[4],
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  text: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.regular },
  action: { alignSelf: 'flex-start', marginTop: Space[2], minHeight: 28, justifyContent: 'center' },
  actionLabel: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.bold, fontWeight: '700', textDecorationLine: 'underline' },
  dismiss: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
});
