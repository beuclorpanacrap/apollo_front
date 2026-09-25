import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'compact';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  size = 'default',
  icon,
  loading,
  fullWidth,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.tintStrong, fg: theme.onTint },
    secondary: { bg: theme.pillGreenBg, fg: theme.tintStrong },
    ghost: { bg: 'transparent', fg: theme.tintStrong, border: theme.border },
    danger: { bg: theme.dangerBg, fg: theme.danger },
  };
  const colors = palette[variant];
  const isCompact = size === 'compact';

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        isCompact ? styles.baseCompact : null,
        { backgroundColor: colors.bg },
        colors.border ? { borderWidth: 1, borderColor: colors.border } : null,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={isCompact ? 16 : 18} color={colors.fg} /> : null}
          <Text style={[styles.label, isCompact ? styles.labelCompact : null, { color: colors.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
  },
  // Same visual language as `base` (colors, radius proportion, icon+label
  // pairing) — just dialed down a notch for spots that sit inline with
  // other content rather than anchoring their own row.
  baseCompact: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    gap: Spacing.one,
  },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontSize: 15, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  labelCompact: { fontSize: 13 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
