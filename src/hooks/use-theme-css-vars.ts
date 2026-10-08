import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';

import { mix, withAlpha } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';

/**
 * Mirrors theme.ts tokens into CSS variables on <html> (web only) so the few things that cannot be
 * expressed through react-native styles — `::placeholder`, `:focus`, shimmer, scrollbars, native
 * form-control chrome via `color-scheme` — follow the chosen light/dark theme and never drift from
 * the tokens. Runs in a layout effect so the first painted frame is already themed.
 */
export function useThemeCssVars() {
  const theme = useTheme();
  const isDark = useIsDark();

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    const vars: Record<string, string> = {
      '--ap-focus': theme.focusRing,
      '--ap-focus-halo': withAlpha(theme.focusRing, 0.28),
      '--ap-placeholder': theme.placeholder,
      '--ap-danger': theme.dangerText,
      '--ap-border-strong': theme.borderStrong,
      '--ap-field-bg': theme.backgroundElement,
      '--ap-field-disabled-bg': theme.surfaceMuted,
      '--ap-selection': withAlpha(theme.tint, 0.32),
      '--ap-shimmer': isDark ? withAlpha(theme.text, 0.07) : withAlpha(theme.backgroundElement, 0.7),
      '--ap-flash': withAlpha(theme.tint, isDark ? 0.55 : 0.4),
      '--ap-flash-soft': withAlpha(theme.tint, isDark ? 0.3 : 0.2),
      '--ap-scroll-thumb': withAlpha(theme.borderStrong, 0.55),
      '--ap-hover-bg': isDark ? theme.backgroundSelected : theme.surfaceMuted,
      '--ap-pressed-bg': mix(isDark ? theme.backgroundSelected : theme.surfaceMuted, theme.text, 0.07),
    };
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
    // Native controls (select popups, date pickers, scrollbars) pick their chrome from color-scheme.
    root.style.colorScheme = isDark ? 'dark' : 'light';
    // Keep the page behind overscroll / before first paint on-brand too.
    root.style.backgroundColor = theme.background;
    if (document.body) document.body.style.backgroundColor = theme.background;
  }, [theme, isDark]);
}
