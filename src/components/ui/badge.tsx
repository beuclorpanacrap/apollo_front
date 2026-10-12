import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';

type BadgeProps = {
  label: string;
  bg: string;
  fg: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** `sm` (default, 11px) is the patient app's size; `md` (12px text + icon) is the portal's. */
  size?: 'sm' | 'md';
  /** Layout overrides, e.g. `{ alignSelf: 'center' }` when the badge sits in a vertically centered row. */
  style?: StyleProp<ViewStyle>;
};

/** Sentence-case by design — "Doctor verified", not "DOCTOR VERIFIED". Pass
 *  the label already cased the way it should read. */
export function Badge({ label, bg, fg, icon, size = 'sm', style }: BadgeProps) {
  const md = size === 'md';
  return (
    <View style={[styles.badge, md ? styles.badgeMd : null, { backgroundColor: bg }, style]}>
      {icon ? <Ionicons name={icon} size={md ? 12 : 11} color={fg} /> : null}
      <Text style={[styles.badgeText, md ? styles.badgeTextMd : null, { color: fg }]}>{label}</Text>
    </View>
  );
}

type IconBubbleProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  bg: string;
  fg: string;
  size?: number;
};

export function IconBubble({ icon, bg, fg, size = 40 }: IconBubbleProps) {
  return (
    <View
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeMd: { gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  badgeTextMd: { fontSize: 12, lineHeight: 16 },
  bubble: { alignItems: 'center', justifyContent: 'center' },
});
