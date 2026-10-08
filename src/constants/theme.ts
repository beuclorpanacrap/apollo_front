/**
 * Apollo brand tokens.
 *
 * Core palette (do not add new raw hex elsewhere — extend this file instead):
 *   cream        #FAF4E3  – page background
 *   spring green #4FAE72  – primary actions / active states
 *   deep green   #327A4C  – pressed / stronger accents / headers
 *   wood text    #2E5C40  – primary text
 *   peach pill   #FBEADB  – secondary badge surface
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

const brand = {
  cream: '#FAF4E3',
  springGreen: '#4FAE72',
  deepGreen: '#327A4C',
  woodText: '#2E5C40',
  peachPill: '#FBEADB',
  // Added for the vault redesign — warm, distinct from the green brand pair,
  // used to tell entry *types* apart at a glance (prescriptions / labs /
  // conditions). Keep new raw hex here, not inline in screens.
  marigold: '#D99A3D', // Prescriptions
  clay: '#C9714F', // Lab / test results
  plum: '#CE4685', // Chronic condition — vivid, berry-leaning
  coral: '#D9634A', // Allergy — vivid, red-leaning (caution)
  honey: '#DDAC3D', // Lifestyle — vivid, yellow-leaning (upbeat)
} as const;

export const BrandColors = brand;

export const Colors = {
  light: {
    text: brand.woodText,
    textSecondary: '#67876F',
    textTertiary: '#90A691',
    background: brand.cream,
    backgroundElement: '#FFFDF7',
    backgroundSelected: '#DCEFE3',
    surfaceMuted: '#EDEBDC',
    border: '#DADDCD',
    tint: brand.springGreen,
    tintStrong: brand.deepGreen,
    onTint: '#FFFFFF',
    pillGreenBg: '#DCEFE3',
    pillGreenText: brand.woodText,
    pillPeachBg: brand.peachPill,
    pillPeachText: '#8B5A2E',
    pillMarigoldBg: '#F6E6C9',
    pillMarigoldText: '#7A5518',
    pillClayBg: '#F3DED3',
    pillClayText: '#7A3F2C',
    pillPlumBg: '#F2D4E2',
    pillPlumText: '#822651',
    pillCoralBg: '#F5DCD5',
    pillCoralText: '#8C3D2A',
    pillHoneyBg: '#F6EAC7',
    pillHoneyText: '#6B5518',
    danger: '#D32F2F',
    dangerBg: '#FFEBEE',
    // ---- Accessibility + portal tokens (additive; existing values above are untouched) ----
    // Text that must reach 4.5:1 where `textSecondary`/`textTertiary` (3.9 / 2.6 on the card) cannot.
    textMuted: '#4B6A54', // 5.92 on card, 5.48 on cream, 5.02 on pillGreenBg / surfaceMuted
    accentText: '#2A6B42', // green text / links / secondary buttons — 6.29 on card
    dangerText: '#B3261E', // error text — 6.43 on card, 5.72 on dangerBg
    // Interactive control outlines (WCAG 1.4.11, >= 3:1). `border` stays for decorative card edges.
    borderStrong: '#758B7B', // 3.60 on card, 3.33 on cream
    focusRing: '#327A4C', // 2px focus outline, 4.75 on cream
    placeholder: '#587360', // 5.12 on card, 4.74 on cream
    // Portal hero card (green header). Gradient stays inside 4.9–6.3:1 against cream text.
    heroFrom: '#357D52',
    heroTo: '#2A6B42',
    heroBorder: 'transparent',
    heroText: '#FFFDF7', // 4.91 on heroFrom, 6.29 on heroTo
    heroTextMuted: '#F3F8EE',
    heroChipBg: 'rgba(20, 58, 36, 0.38)', // dark translucent chip → cream text ≥ 6.9:1
    heroChipText: '#FFFDF7',
    heroGlow: 'rgba(255, 253, 247, 0.07)', // decorative circles only — never behind small text
    scrim: 'rgba(24, 45, 32, 0.55)', // modal backdrop
  },
  dark: {
    text: brand.cream,
    textSecondary: '#B3C0AD',
    textTertiary: '#8CA286',
    background: '#1E3C2A',
    backgroundElement: '#264B34',
    backgroundSelected: '#2F5C3F',
    surfaceMuted: '#24462F',
    border: '#35573F',
    tint: brand.springGreen,
    tintStrong: '#3F9963',
    onTint: '#0F2417',
    pillGreenBg: '#2F5C3F',
    pillGreenText: '#DCEFE3',
    pillPeachBg: '#4A3524',
    pillPeachText: '#F0C99A',
    pillMarigoldBg: '#4A3B1C',
    pillMarigoldText: '#F0D9A0',
    pillClayBg: '#4A2E22',
    pillClayText: '#F0C4B0',
    pillPlumBg: '#441D2F',
    pillPlumText: '#EDABCA',
    pillCoralBg: '#4A2620',
    pillCoralText: '#F0BBAC',
    pillHoneyBg: '#3C351C',
    pillHoneyText: '#EDDDA0',
    danger: '#E57373',
    dangerBg: '#4A2020',
    textMuted: '#C2CEBD', // 6.01 on card, 7.41 on page, 4.72 on backgroundSelected
    accentText: '#A3E0B8', // 6.51 on card, 8.02 on page, 5.11 on backgroundSelected
    dangerText: '#F4A3A3', // 4.96 on card, 6.12 on page, 6.99 on dangerBg
    borderStrong: '#78A585', // 3.52 on card, 4.33 on page
    focusRing: '#A3E0B8',
    placeholder: '#A6B9A0', // 4.71 on card, 5.80 on page
    heroFrom: '#33664A',
    heroTo: '#2A5A3C',
    heroBorder: '#3F7A55',
    heroText: '#FAF4E3', // 6.09 on heroFrom
    heroTextMuted: '#DCEFE3', // 5.57 on heroFrom
    heroChipBg: 'rgba(15, 36, 23, 0.40)',
    heroChipText: '#FAF4E3',
    heroGlow: 'rgba(163, 224, 184, 0.07)',
    scrim: 'rgba(6, 18, 11, 0.68)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type AppTheme = { [Key in ThemeColor]: string };

/**
 * Two type families, used deliberately:
 *  - `display` (Poppins, extra-bold) is reserved for the app name and the
 *    person's name 
 *  - `sans` (Inter) is every other body/heading weight in the app.

 */
export const Fonts = Platform.select({
  web: {
    sans: {
      regular: 'var(--font-body)',
      medium: 'var(--font-body)',
      semiBold: 'var(--font-body)',
      bold: 'var(--font-body)',
      extraBold: 'var(--font-body)',
    },
    display: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
  default: {
    sans: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semiBold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
      extraBold: 'Inter_800ExtraBold',
    },
    display: 'Poppins_800ExtraBold',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
}) as {
  sans: { regular: string; medium: string; semiBold: string; bold: string; extraBold: string };
  display: string;
  serif: string;
  rounded: string;
  mono: string;
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** 4/8-grid spacing scale for the clinician portal (the legacy `Spacing` above is untouched). */
export const Space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64 } as const;

/** One radius scale so cards, tiles, chips and controls stay proportionate. */
export const Radii = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 } as const;

export const Layout = {
  /** Portal content column (header and page content align to this). */
  contentMaxWidth: 1120,
  /** Narrower block for pages that should read as one compact box (Profile). Centered inside the content column. */
  blockMaxWidth: 960,
  headerHeight: 68,
  /** Breakpoints (px). Below `tablet` the portal uses its compact navigation. */
  phone: 600,
  tablet: 900,
  desktop: 1100,
} as const;

/** Motion spec: three durations, one easing. Everything is zeroed under reduced motion. */
export const Motion = {
  fast: 120,
  base: 200,
  slow: 280,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/**
 * Type scale. `display` is reserved for the app name and a person's name (Poppins);
 * everything else is Inter. Compose these inside StyleSheet.create — don't re-declare sizes inline.
 */
export const TextStyles = {
  display: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  displaySm: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  h1: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  h2: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 15, lineHeight: 22 },
  body: { fontFamily: Fonts.sans.regular, fontSize: 14, lineHeight: 22 },
  bodyStrong: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 14, lineHeight: 22 },
  small: { fontFamily: Fonts.sans.regular, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: Fonts.sans.medium, fontWeight: '500', fontSize: 12, lineHeight: 18 },
  label: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type ElevationLevel = 'card' | 'raised' | 'overlay';

/** Layered, gentle shadows tinted with the brand green (neutral black in dark mode). */
export function elevationStyle(level: ElevationLevel, isDark: boolean): ViewStyle {
  const web = {
    card: isDark
      ? '0 1px 2px rgba(0, 0, 0, 0.30), 0 4px 14px rgba(0, 0, 0, 0.22)'
      : '0 1px 2px rgba(36, 107, 68, 0.06), 0 4px 14px rgba(36, 107, 68, 0.07)',
    raised: isDark
      ? '0 2px 4px rgba(0, 0, 0, 0.30), 0 10px 28px rgba(0, 0, 0, 0.35)'
      : '0 2px 4px rgba(36, 107, 68, 0.08), 0 10px 28px rgba(36, 107, 68, 0.14)',
    overlay: isDark
      ? '0 24px 64px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.30)'
      : '0 24px 64px rgba(16, 48, 30, 0.30), 0 4px 12px rgba(16, 48, 30, 0.12)',
  }[level];
  const native = {
    card: { shadowOpacity: 0.07, shadowRadius: 10, height: 3, elevation: 1 },
    raised: { shadowOpacity: 0.14, shadowRadius: 20, height: 8, elevation: 4 },
    overlay: { shadowOpacity: 0.3, shadowRadius: 40, height: 20, elevation: 12 },
  }[level];
  return Platform.select<ViewStyle>({
    web: { boxShadow: web },
    default: {
      shadowColor: isDark ? '#000000' : BrandColors.deepGreen,
      shadowOffset: { width: 0, height: native.height },
      shadowOpacity: native.shadowOpacity,
      shadowRadius: native.shadowRadius,
      elevation: native.elevation,
    },
  }) as ViewStyle;
}

/** `#RRGGBB` (or `#RGB`) + alpha → `rgba(...)`. Anything else (rgba(), 'transparent') is returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Blend two `#RRGGBB` colors; `weight` is how much of `other` to mix in (0–1). Used for hover shades. */
export function mix(color: string, other: string, weight: number): string {
  const parse = (value: string) => {
    const m = /^#([0-9a-f]{6})$/i.exec(value.trim());
    return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
  };
  const a = parse(color);
  const b = parse(other);
  if (!a || !b) return color;
  const out = a.map((channel, i) => Math.round(channel * (1 - weight) + b[i] * weight));
  return `#${out.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
