import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';

type BadgeProps = {
  label: string;
  bg: string;
  fg: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

/** Sentence-case by design — "Doctor verified", not "DOCTOR VERIFIED". Pass
 *  the label already cased the way it should read. */
export function Badge({ label, bg, fg, icon }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
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
  badgeText: { fontSize: 11, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  bubble: { alignItems: 'center', justifyContent: 'center' },
});
