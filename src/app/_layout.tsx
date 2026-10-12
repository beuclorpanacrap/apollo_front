import React, { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useGlobalSearchParams,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
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
import { AppMark } from '@/components/app-mark';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ClinicianVaultProvider } from '@/context/clinician-vault-context';
import { AppThemeProvider, useThemeContext } from '@/context/theme-context';
import { VaultProvider } from '@/context/vault-context';
import { BrandColors, Colors } from '@/constants/theme';
import { clinicianSignInHref, isDoctorSegment, isPortalSegment, safePortalNext } from '@/utils/portal-routes';

SplashScreen.preventAutoHideAsync();

// Cream (#FAF4E3) in light mode; dark mode keeps its own palette background.
function useAppBackground() {
  const { theme, isDark } = useThemeContext();
  return isDark ? theme.background : BrandColors.cream;
}

function RouteGuard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme } = useThemeContext();
  const background = useAppBackground();
  const segments = useSegments();
  const router = useRouter();
  const { next: nextParam } = useGlobalSearchParams<{ next?: string }>();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    // The branded 404 must be reachable whether or not someone is signed in.
    if (firstSegment === '+not-found') return;
    const inAuthFlow =
      firstSegment === 'welcome' ||
      firstSegment === 'sign-in' ||
      firstSegment === 'sign-up' ||
      firstSegment === 'register-patient' ||
      firstSegment === 'register-doctor' ||
      firstSegment === 'index' ||
      firstSegment === undefined;

    if (!isAuthenticated && !inAuthFlow) {
      // A signed-out deep link to a portal page remembers where it was heading (allow-listed routes only).
      const returnTo = firstSegment ? safePortalNext(`/${firstSegment}`) : null;
      router.replace(returnTo ? clinicianSignInHref(returnTo) : '/welcome');
    } else if (isAuthenticated && user?.role === 'ROLE_DOCTOR') {
      if (!isDoctorSegment(firstSegment)) {
        // Right after clinician sign-in, honor a validated `?next=`; everything else lands on the dashboard.
        router.replace(firstSegment === 'sign-in' ? safePortalNext(nextParam) ?? '/doctor' : '/doctor');
      }
    } else if (isAuthenticated && (inAuthFlow || isDoctorSegment(firstSegment))) {
      if (firstSegment === 'register-patient') {
        // Send newly registered users straight into the baseline survey.
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
    // Note: deliberately not redirecting away from /onboarding here â€” a
    // signed-in user must be able to stay on it (first-run survey, or
    // revisiting it later from the Documentation tab to update their baseline).
  }, [isAuthenticated, isLoading, segments, user?.role, router, nextParam]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Protected guard={isAuthenticated && user?.role !== 'ROLE_DOCTOR'}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
      <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sign-up" options={{ presentation: 'modal' }} />
      <Stack.Screen name="register-patient" />
      <Stack.Screen name="register-doctor" />
      <Stack.Screen name="doctor" />
      <Stack.Screen name="doctor-vault" />
      <Stack.Screen name="doctor-profile" />
      <Stack.Screen name="doctor-lab-result" />
    </Stack>
  );
}

function WebFrameContainer({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useThemeContext();
  const background = useAppBackground();
  const segments = useSegments();
  const firstSegment = segments[0] as string | undefined;
  if (Platform.OS === 'web') {
    // The clinician portal is a full-width desktop workspace: no phone-style frame, borders or shadow.
    if (isPortalSegment(firstSegment) || firstSegment === 'register-doctor') {
      return <View style={[styles.webPortal, { backgroundColor: background }]}>{children}</View>;
    }
    return (
      <View style={[styles.webOuter, { backgroundColor: isDark ? '#0B1110' : theme.surfaceMuted }]}>
        <View
          style={[
            styles.webFrame,
            {
              backgroundColor: background,
              borderColor: isDark ? '#1D2A26' : theme.border,
              boxShadow: isDark
                ? '0 4px 20px rgba(0, 0, 0, 0.5)'
                : '0 4px 16px rgba(50, 122, 76, 0.08)',
            },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }
  return <>{children}</>;
}

function ThemedNavigationRoot() {
  const { theme, isDark } = useThemeContext();
  const background = useAppBackground();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: theme.tint,
      background,
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

function BootShell() {
  const scheme = useColorScheme();
  return (
    <View style={[styles.boot, { backgroundColor: scheme === 'dark' ? Colors.dark.background : BrandColors.cream }]}>
      <AppMark size={72} />
    </View>
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
    // Web: a branded first paint (matches the static shell in +html.tsx) instead of a blank page.
    return Platform.OS === 'web' ? <BootShell /> : null;
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <VaultProvider>
          <ClinicianVaultProvider>
            <ThemedNavigationRoot />
          </ClinicianVaultProvider>
        </VaultProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webPortal: { flex: 1, width: '100%', height: '100%' },
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
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
});
