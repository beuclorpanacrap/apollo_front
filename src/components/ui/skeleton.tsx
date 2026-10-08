import { Platform, View, type DimensionValue, type ViewStyle } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Placeholder block. On web it shimmers via the `.ap-skeleton` rule in global.css, which freezes under
 * `prefers-reduced-motion`; on native it is a flat tinted block (no animation).
 */
export function Skeleton({ width = '100%', height = 16, radius = Radii.sm, style }: SkeletonProps) {
  const theme = useTheme();
  const box = { width, height, borderRadius: radius, backgroundColor: theme.surfaceMuted } as const;
  if (Platform.OS === 'web') {
    // A raw element so the CSS class (keyframes) can be applied; sized with the same style object.
    return <div className="ap-skeleton" aria-hidden style={{ ...(box as object), ...(style as object) }} />;
  }
  return <View style={[box, style]} />;
}
