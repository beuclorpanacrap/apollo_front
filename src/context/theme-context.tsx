import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { Colors, AppTheme } from '@/constants/theme';
import { storage } from '@/utils/storage';

export type ThemeMode = 'System' | 'Light' | 'Dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'apollo_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('System');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await storage.getItem(THEME_STORAGE_KEY);
        if (stored === 'Light' || stored === 'Dark' || stored === 'System') {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.warn('[ThemeContext] Error loading theme mode:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadStoredTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await storage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('[ThemeContext] Error saving theme mode:', e);
    }
  };

  const isDark =
    themeMode === 'Dark' || (themeMode === 'System' && systemScheme === 'dark');

  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within an AppThemeProvider');
  }
  return context;
}
