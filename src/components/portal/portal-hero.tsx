import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Radii, Space, elevationStyle, mix, withAlpha } from '@/constants/theme';
import { pressState, useInteractive } from '@/components/ui/interactive';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { webProps, webStyle } from '@/utils/web-props';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The portal's green header card. It echoes the patient home's header row (deep green, rounded, cream
 * greeting + Poppins name) and goes a step further: a soft two-stop gradient built from the hero tokens,
 * quiet concentric rings (an "orbit" motif) and a thin top highlight give it depth without adding color.
 */
export function PortalHero({
  eyebrow,
  eyebrowIcon,
  title,
  titleRef,
  subtitle,
  leading,
  chips,
  aside,
  size = 'default',
  children,
}: {
  eyebrow?: string;
  eyebrowIcon?: IconName;
  title: string;
  /** Set on the <h1> so it can receive programmatic focus after unlock. */
  titleRef?: (node: unknown) => void;
  subtitle?: string;
  leading?: ReactNode;
  chips?: ReactNode;
  aside?: ReactNode;
  /** `compact` is a slim banner (eyebrow + title only) for pages that should read as one tight block. */
  size?: 'default' | 'compact';
  children?: ReactNode;
}) {
  const theme = useTheme();
  const isDark = useIsDark();
  const { isPhone, width } = useBreakpoint();
  const compact = isPhone;
  const slim = size === 'compact';
  const titleSize = slim ? (compact ? 26 : 30) : compact ? 28 : width < 900 ? 32 : 38;

  return (
    <View
      style={[
        styles.hero,
        {
          borderRadius: compact || slim ? Radii.xl : Radii.xxl,
          ...(slim
            ? { paddingVertical: compact ? Space[4] : Space[5], paddingHorizontal: compact ? Space[4] : Space[6] }
            : { padding: compact ? Space[5] : Space[8] }),
          backgroundColor: theme.heroFrom,
          borderColor: theme.heroBorder,
        },
        webStyle({ backgroundImage: `linear-gradient(135deg, ${theme.heroFrom} 0%, ${theme.heroTo} 100%)` }),
        elevationStyle('raised', isDark),
      ]}
    >
      {/* Decorative: concentric rings + a top highlight. Hidden from assistive tech, never behind small text. */}
      <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
        <View style={[styles.ring, { width: 440, height: 440, right: -120, top: -170, borderColor: theme.heroGlow }]} />
        <View style={[styles.ring, { width: 300, height: 300, right: -50, top: -100, borderColor: theme.heroGlow }]} />
        <View style={[styles.disc, { width: 190, height: 190, right: 10, top: -60, backgroundColor: theme.heroGlow }]} />
        <View style={[styles.disc, { width: 120, height: 120, left: -40, bottom: -50, backgroundColor: theme.heroGlow }]} />
        <View style={[styles.highlight, { backgroundColor: withAlpha(theme.heroText, 0.18) }]} />
      </View>

      <View style={[styles.row, compact ? styles.rowCompact : null]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.copy}>
          {eyebrow ? (
            <View style={styles.eyebrowRow}>
              {eyebrowIcon ? <Ionicons name={eyebrowIcon} size={16} color={theme.heroTextMuted} /> : null}
              <Text style={[styles.eyebrow, { color: theme.heroTextMuted }]}>{eyebrow}</Text>
            </View>
          ) : null}
          <Text
            ref={titleRef}
            role="heading"
            {...webProps({ 'aria-level': 1, tabIndex: -1 })}
            style={[
              styles.title,
              { color: theme.heroText, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.15) },
              webStyle({ outlineStyle: 'none', overflowWrap: 'anywhere' }),
            ]}
          >
            {title}
          </Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.heroTextMuted }]}>{subtitle}</Text> : null}
          {chips ? <View style={styles.chips}>{chips}</View> : null}
        </View>
        {aside ? <View style={[styles.aside, compact ? styles.asideCompact : null]}>{aside}</View> : null}
      </View>
      {children}
    </View>
  );
}

/** Small translucent pill that sits on the hero. Text is cream on a dark scrim (≥ 6.9:1). */
export function HeroChip({ label, icon }: { label: string; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.heroChipBg }]}>
      {icon ? <Ionicons name={icon} size={14} color={theme.heroChipText} /> : null}
      <Text style={[styles.chipLabel, { color: theme.heroChipText }]}>{label}</Text>
    </View>
  );
}

/** Secondary action on the hero: translucent fill, cream text, cream focus ring (the green ring would vanish here). */
export function HeroButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const fx = useInteractive();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={(state) => {
        const s = pressState(state);
        return [
          styles.heroButton,
          {
            backgroundColor: s.hovered && !disabled ? mix(theme.heroTo, theme.heroText, 0.14) : theme.heroChipBg,
            borderColor: withAlpha(theme.heroText, 0.4),
          },
          disabled && { opacity: 0.55 },
          s.pressed && !disabled && { opacity: 0.85 },
          s.focused && fx.keyboard
            ? webStyle({ outlineColor: theme.heroText, outlineOffset: 2, outlineStyle: 'solid', outlineWidth: 2 })
            : null,
          fx.transition,
        ];
      }}
    >
      {icon ? <Ionicons name={icon} size={18} color={theme.heroText} /> : null}
      <Text style={[styles.heroButtonLabel, { color: theme.heroText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderWidth: 1, position: 'relative' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1.5 },
  disc: { position: 'absolute', borderRadius: 999 },
  highlight: { position: 'absolute', left: 24, right: 24, top: 0, height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[5], flexWrap: 'wrap' },
  rowCompact: { alignItems: 'flex-start', gap: Space[4] },
  leading: { flexShrink: 0 },
  copy: { flex: 1, minWidth: 220, gap: Space[2] },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  title: { fontFamily: Fonts.display, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, lineHeight: 23, fontFamily: Fonts.sans.regular, maxWidth: 620 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2], marginTop: Space[2] },
  aside: { flexShrink: 0, alignItems: 'flex-end', gap: Space[3] },
  asideCompact: { alignItems: 'stretch', alignSelf: 'stretch' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
  },
  chipLabel: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: Radii.md + 2,
    borderWidth: 1,
  },
  heroButtonLabel: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
});
