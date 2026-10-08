import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';

import { AppMark } from '@/components/app-mark';
import { Button } from '@/components/ui/button';
import { Fonts, Space } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { webProps } from '@/utils/web-props';

/** Branded 404. RouteGuard lets `+not-found` through for everyone, so this is reachable signed in or out. */
export default function NotFoundScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isDoctor = isAuthenticated && user?.role === 'ROLE_DOCTOR';

  return (
    <View role="main" style={[styles.screen, { backgroundColor: theme.background }]}>
      <Head>
        <title>Page not found · Apollo</title>
        <meta name="robots" content="noindex" />
      </Head>
      <AppMark size={64} />
      <Text style={[styles.code, { color: theme.accentText }]}>404</Text>
      <Text role="heading" {...webProps({ 'aria-level': 1 })} style={[styles.title, { color: theme.text }]}>
        We couldn’t find that page
      </Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        The link may be out of date, or the page may have moved. Nothing has been changed in your account.
      </Text>
      <View style={styles.action}>
        <Button
          label={isDoctor ? 'Back to your workspace' : isAuthenticated ? 'Back to Apollo' : 'Go to Apollo'}
          icon="arrow-back"
          portal
          fullWidth
          onPress={() => router.replace(isDoctor ? '/doctor' : isAuthenticated ? '/(tabs)' : '/welcome')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space[7], gap: Space[3] },
  code: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 15, letterSpacing: 2, marginTop: Space[2] },
  title: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 26, lineHeight: 32, textAlign: 'center' },
  body: { fontFamily: Fonts.sans.regular, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 420 },
  action: { width: '100%', maxWidth: 320, marginTop: Space[3] },
});
