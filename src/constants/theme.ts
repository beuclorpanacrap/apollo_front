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
  cream: '#FBF6E8',
  springGreen: '#4FAE72',
  deepGreen: '#327A4C',
  woodText: '#2E5C40',
  peachPill: '#FBEADB',
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
    danger: '#D32F2F',
    dangerBg: '#FFEBEE',
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
    danger: '#E57373',
    dangerBg: '#4A2020',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
