/**
 * Apollo brand tokens.
 *
 * Core palette (do not add new raw hex elsewhere — extend this file instead):
 *   cream        #FBF6E8  – page background
 *   spring green #4FAE72  – primary actions / active states
 *   deep green   #327A4C  – pressed / stronger accents / headers
 *   wood text    #2E5C40  – primary text
 *   peach pill   #FBEADB  – secondary badge surface
 */

import '@/global.css';

import { Platform } from 'react-native';

const brand = {
  cream: '#FBF8F1',
  surfaceCard: '#FFFFFF',
  forestGreen: '#2D7A4F',
  headerGreen: '#246B44',
  darkCharcoal: '#1B2A20',
  mutedSecondary: '#6B7280',
  peachPill: '#FBEADB',
  springGreen: '#2D7A4F',
  deepGreen: '#246B44',
  woodText: '#1B2A20',
} as const;

export const BrandColors = brand;

export interface AppTheme {
  text: string;
  textSecondary: string;
  textTertiary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  surfaceMuted: string;
  border: string;
  tint: string;
  tintStrong: string;
  onTint: string;
  pillGreenBg: string;
  pillGreenText: string;
  pillPeachBg: string;
  pillPeachText: string;
  danger: string;
  dangerBg: string;
}

export const Colors: { light: AppTheme; dark: AppTheme } = {
  light: {
    text: brand.darkCharcoal,
    textSecondary: brand.mutedSecondary,
    textTertiary: '#9CA3AF',
    background: '#FBF8F1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#DCEFE3',
    surfaceMuted: '#F7F4EC',
    border: '#EBE6DD',
    tint: '#2D7A4F',
    tintStrong: '#246B44',
    onTint: '#FFFFFF',
    pillGreenBg: '#EAF7EF',
    pillGreenText: '#246B44',
    pillPeachBg: brand.peachPill,
    pillPeachText: '#8B5A2E',
    danger: '#D32F2F',
    dangerBg: '#FFEBEE',
  },
  dark: {
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textTertiary: '#64748B',
    background: '#111817',
    backgroundElement: '#1A2421',
    backgroundSelected: '#273732',
    surfaceMuted: '#0F1715',
    border: '#273732',
    tint: '#34D399',
    tintStrong: '#4ADE80',
    onTint: '#0F1715',
    pillGreenBg: '#273732',
    pillGreenText: '#34D399',
    pillPeachBg: '#3E2D1E',
    pillPeachText: '#FBBF24',
    danger: '#F87171',
    dangerBg: '#451A1A',
  },
};

export type ThemeColor = keyof AppTheme;

/**
 * Two type families, used deliberately:
 *  - `display` (Poppins, extra-bold) is reserved for the app name and the
 *    person's name — the one or two places per screen that should carry
 *    personality.
 *  - `sans` (Inter) is every other body/heading weight in the app.
 * Native platforms need one distinct font-family name per weight (that's
 * how the loaded .ttf files work); web loads Inter/Poppins as real
 * multi-weight webfonts, so `fontWeight` alone does the job there.
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
