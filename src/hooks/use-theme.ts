/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';

// Every screen in this app currently hardcodes Colors.light (dark mode isn't
// wired up anywhere else yet — see theme.ts). This hook used to follow the
// system color scheme, which meant components built on it (ThemedText,
// ThemedView, Collapsible, and the vault UI) would flip to the dark palette
// on a dark-mode device while every surrounding screen stayed light —
// a broken-looking, inconsistent mix. Pinned to light so the whole app reads
// consistently until dark mode is deliberately built out everywhere.
export function useTheme() {
  return Colors.light;
}
