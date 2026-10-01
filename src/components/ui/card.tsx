import { Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  onPress?: () => void;
  /** A colored left edge — used across the vault to tell entry types apart
   *  at a glance without shouting about it in all-caps text. */
  accentColor?: string;
  disabled?: boolean;
};

export function Card({ style, onPress, accentColor, disabled, children, ...rest }: CardProps) {
  const theme = useTheme();

  const cardStyle = [
    styles.base,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
    Platform.select({
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
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
        {...(rest as any)}
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
  pressed: { opacity: 0.88 },
});
