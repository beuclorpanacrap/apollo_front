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

import { Platform } from 'react-native';

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
