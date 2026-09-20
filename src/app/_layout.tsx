import React, { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AppThemeProvider, useThemeContext } from '@/context/theme-context';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useThemeContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthFlow =
      firstSegment === 'welcome' ||
      firstSegment === 'sign-in' ||
      firstSegment === 'sign-up';

    if (!isAuthenticated && !inAuthFlow) {
      router.replace('/welcome');
    } else if (isAuthenticated && inAuthFlow) {
      if (firstSegment === 'sign-up') {
        // Send newly registered users straight into the baseline survey.
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
    // Note: deliberately not redirecting away from /onboarding here — a
    // signed-in user must be able to stay on it (first-run survey, or
    // revisiting it later from the Documentation tab to update their baseline).
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sign-up" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function WebFrameContainer({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeContext();
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webOuter, { backgroundColor: theme.surfaceMuted }]}>
        <View style={[styles.webFrame, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {children}
        </View>
      </View>
    );
  }
  return <>{children}</>;
}

function ThemedNavigationRoot() {
  const { theme, isDark } = useThemeContext();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: theme.tint,
      background: theme.background,
      card: theme.backgroundElement,
      text: theme.text,
      border: theme.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <WebFrameContainer>
        <RouteGuard />
      </WebFrameContainer>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Poppins_800ExtraBold,
  });

  // Keep the native splash screen up (AnimatedSplashOverlay is what calls
  // SplashScreen.hideAsync()) until Poppins/Inter are actually ready, so we
  // never flash system-font text before the brand fonts swap in.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <ThemedNavigationRoot />
      </AuthProvider>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(50, 122, 76, 0.12)',
      },
      default: {
        shadowColor: '#246B44',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
});