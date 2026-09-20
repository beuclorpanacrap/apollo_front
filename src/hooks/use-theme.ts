import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeContext } from '@/context/theme-context';

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
