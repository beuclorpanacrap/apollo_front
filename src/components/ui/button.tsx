import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing, mix } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { pressState, useInteractive } from './interactive';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'compact';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Opt-in portal sizing: 44px minimum height, 14px compact label, and text colors that clear 4.5:1
   * in both modes. Patient screens never pass this, so their look is unchanged.
   */
  portal?: boolean;
  /** Layout-only overrides (alignSelf, flex…). */
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'default',
  icon,
  loading,
  fullWidth,
  disabled,
  portal,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDark = useIsDark();
  const fx = useInteractive();
  // Remember the idle width so showing the spinner doesn't make the button jump.
  const [idleWidth, setIdleWidth] = useState<number | null>(null);

  const isDisabled = !!disabled || !!loading;
  // Dark-mode (and portal) text uses `accentText`/`dangerText`: `tintStrong` on `pillGreenBg` is 2.18:1 in dark.
  const readableAccent = portal || isDark ? theme.accentText : theme.tintStrong;

  const palette: Record<ButtonVariant, { bg: string; fg: string; hover: string; border?: string }> = {
    primary: {
      bg: theme.tintStrong,
      fg: theme.onTint,
      hover: isDark ? theme.tint : mix(theme.tintStrong, theme.text, 0.3),
    },
    secondary: { bg: theme.pillGreenBg, fg: readableAccent, hover: mix(theme.pillGreenBg, theme.text, 0.07) },
    ghost: {
      bg: 'transparent',
      fg: readableAccent,
      hover: isDark ? theme.backgroundSelected : theme.surfaceMuted,
      border: portal ? theme.borderStrong : theme.border,
    },
    danger: { bg: theme.dangerBg, fg: theme.dangerText, hover: mix(theme.dangerBg, theme.dangerText, 0.08) },
  };
  const colors = palette[variant];
  const isCompact = size === 'compact';

  const onLayout = (event: LayoutChangeEvent) => {
    if (!loading) setIdleWidth(Math.round(event.nativeEvent.layout.width));
  };

  const spinnerSize = isCompact ? 14 : 18;

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      accessibilityLabel={loading ? `${label}, in progress` : accessibilityLabel}
      aria-busy={loading || undefined}
      onLayout={onLayout}
      style={(state) => {
        const s = pressState(state);
        return [
          styles.base,
          isCompact ? styles.baseCompact : null,
          portal ? (isCompact ? styles.portalCompact : styles.portalBase) : null,
          { backgroundColor: s.hovered && !isDisabled ? colors.hover : colors.bg },
          colors.border ? { borderWidth: 1, borderColor: colors.border } : null,
          fullWidth ? styles.fullWidth : null,
          loading && idleWidth ? { minWidth: idleWidth } : null,
          disabled ? styles.disabled : loading ? styles.loading : null,
          s.pressed && !isDisabled ? styles.pressed : null,
          fx.ring(theme, s),
          fx.transition,
          style,
        ];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size={spinnerSize} color={colors.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={isCompact ? 16 : 18} color={colors.fg} />
      ) : null}
      <Text
        style={[
          styles.label,
          isCompact ? (portal ? styles.labelCompactPortal : styles.labelCompact) : null,
          { color: colors.fg },
        ]}
      >
        {label}
      </Text>
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
  portalBase: { minHeight: 48, paddingVertical: 12 },
  portalCompact: { minHeight: 44, paddingVertical: 10 },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontSize: 15, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  labelCompact: { fontSize: 13 },
  labelCompactPortal: { fontSize: 14 },
  disabled: { opacity: 0.5 },
  loading: { opacity: 0.9 },
  pressed: { opacity: 0.85 },
});
