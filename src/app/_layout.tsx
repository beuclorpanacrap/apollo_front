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
  useColorScheme,
  View,
} from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup =
      firstSegment === 'sign-in' ||
      firstSegment === 'sign-up' ||
      firstSegment === 'welcome';
    const isOnboarding = firstSegment === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated users to welcome
      router.replace('/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      if (firstSegment === 'sign-up') {
        // Redirect newly registered users directly to the onboarding survey
        router.replace('/onboarding');
      } else {
        // Only redirect away from sign-in/welcome, DO NOT redirect away from onboarding
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF7D" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}

function WebFrameContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webFrame}>{children}</View>
      </View>
    );
  }
  return <>{children}</>;
}

const ApolloTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF7D',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: 'transparent',
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={ApolloTheme}>
        <AnimatedSplashOverlay />
        <WebFrameContainer>
          <RouteGuard />
        </WebFrameContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webOuter: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
});