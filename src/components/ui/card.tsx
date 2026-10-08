import { Platform, Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { Radii, Space, Spacing, elevationStyle } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { pressState, useInteractive } from './interactive';

type CardProps = ViewProps & {
  onPress?: () => void;
  /** A colored left edge — used across the vault to tell entry types apart
   *  at a glance without shouting about it in all-caps text. */
  accentColor?: string;
  disabled?: boolean;
  /** `portal` = roomier padding, 20px radius and the layered brand shadow. Patient screens use the default. */
  variant?: 'default' | 'portal';
};

export function Card({ style, onPress, accentColor, disabled, variant = 'default', children, ...rest }: CardProps) {
  const theme = useTheme();
  const isDark = useIsDark();
  const fx = useInteractive();
  const portal = variant === 'portal';

  const cardStyle = [
    styles.base,
    portal ? styles.portal : null,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
    portal
      ? elevationStyle('card', isDark)
      : Platform.select({
          web: { boxShadow: '0 2px 10px rgba(50, 122, 76, 0.06)' },
          default: {
            shadowColor: theme.tintStrong,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          },
        }),
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={(state) => {
          const s = pressState(state);
          return [
            ...cardStyle,
            s.hovered && !disabled ? { borderColor: theme.borderStrong } : null,
            s.pressed && styles.pressed,
            fx.ring(theme, s),
            fx.transition,
          ];
        }}
        {...(rest as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
  },
  portal: { borderRadius: Radii.xl, padding: Space[6] },
  pressed: { opacity: 0.88 },
});
