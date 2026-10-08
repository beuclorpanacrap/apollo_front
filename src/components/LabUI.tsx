import type { ReactNode } from 'react';
import { Platform, Pressable, Text, useColorScheme, View, type TextStyle } from 'react-native';

import { Colors, Fonts, Spacing, type AppTheme } from '../constants/theme';
import type { Flag } from './types';

/** Palette for the current light/dark mode. Swap in your own useTheme() if you already have one. */
export function useLabTheme(): AppTheme {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

type Weight = keyof typeof Fonts.sans;

const WEB_WEIGHT: Record<Weight, NonNullable<TextStyle['fontWeight']>> = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

/** Native needs one font family per weight; web needs fontWeight (see the note in theme.ts). */
export function font(weight: Weight = 'regular'): TextStyle {
  return Platform.OS === 'web'
    ? { fontFamily: Fonts.sans[weight], fontWeight: WEB_WEIGHT[weight] }
    : { fontFamily: Fonts.sans[weight] };
}

// ─── Flags ───────────────────────────────────────────────────────────────────

const FLAGS: Record<Flag, { label: string; tone: 'good' | 'warn' | 'critical' }> = {
  normal: { label: 'Normal', tone: 'good' },
  low: { label: '↓ Low', tone: 'warn' },
  high: { label: '↑ High', tone: 'warn' },
  'critical-low': { label: '↓↓ Critical low', tone: 'critical' },
  'critical-high': { label: '↑↑ Critical high', tone: 'critical' },
  abnormal: { label: 'Abnormal', tone: 'warn' },
};

/** Normal → green pill, out of range → peach pill, critical → danger. The label always says it too, never color alone. */
export function flagColors(c: AppTheme, flag: Flag): { bg: string; fg: string } {
  switch (FLAGS[flag].tone) {
    case 'good':
      return { bg: c.pillGreenBg, fg: c.pillGreenText };
    case 'warn':
      return { bg: c.pillPeachBg, fg: c.pillPeachText };
    case 'critical':
      return { bg: c.dangerBg, fg: c.danger };
  }
}

export function FlagPill({ flag }: { flag: Flag }) {
  const c = useLabTheme();
  const { bg, fg } = flagColors(c, flag);
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: Spacing.two + Spacing.half,
        paddingVertical: Spacing.one,
      }}>
      <Text style={[font('semiBold'), { color: fg, fontSize: 12 }]}>{FLAGS[flag].label}</Text>
    </View>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────────────

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  const c = useLabTheme();
  return (
    <View
      style={{
        backgroundColor: c.backgroundElement,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: Spacing.three,
        gap: Spacing.three,
      }}>
      <Text style={[font('bold'), { color: c.tintStrong, fontSize: 16 }]}>{title}</Text>
      {children}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useLabTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? c.tint : c.surfaceMuted,
        borderColor: selected ? c.tint : c.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
      }}>
      <Text style={[font('medium'), { color: selected ? c.onTint : c.text, fontSize: 14 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant,
}: {
  title: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}) {
  const c = useLabTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: Spacing.three,
        backgroundColor: primary
          ? pressed ? c.tintStrong : c.tint
          : pressed ? c.backgroundSelected : c.backgroundElement,
        borderColor: primary ? (pressed ? c.tintStrong : c.tint) : c.border,
      })}>
      <Text style={[font('bold'), { fontSize: 16, color: primary ? c.onTint : c.tintStrong }]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Critical values must be phoned through, so the lab doctor sees this before saving. */
export function CriticalBanner({ labels }: { labels: string[] }) {
  const c = useLabTheme();
  if (labels.length === 0) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: c.dangerBg,
        borderColor: c.danger,
        borderWidth: 1,
        borderRadius: 16,
        padding: Spacing.three,
        gap: Spacing.one,
      }}>
      <Text style={[font('bold'), { color: c.danger, fontSize: 15 }]}>
        Critical value: notify the ordering doctor
      </Text>
      <Text style={[font('regular'), { color: c.danger, fontSize: 14 }]}>{labels.join(', ')}</Text>
    </View>
  );
}
