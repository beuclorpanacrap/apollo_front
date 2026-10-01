import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeContext } from '@/context/theme-context';

// Dark mode is now driven by Settings (see AppThemeProvider in
// theme-context.tsx) rather than hardcoded to light. useTheme() reads from
// that context when it's mounted; the fallback below only kicks in for a
// component rendered outside the provider.
export function useTheme() {
  try {
    const { theme } = useThemeContext();
    return theme;
  } catch {
    const scheme = useColorScheme();
    const themeKey = scheme === 'unspecified' ? 'light' : scheme;
    return Colors[themeKey];
  }
}

export { useThemeContext } from '@/context/theme-context';
