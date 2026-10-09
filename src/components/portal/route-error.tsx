import { StyleSheet, Text, View } from 'react-native';

import { AppMark } from '@/components/app-mark';
import { Button } from '@/components/ui/button';
import { Fonts, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { webProps } from '@/utils/web-props';

/**
 * Exported as `ErrorBoundary` from the portal route files (Expo Router renders it when a screen throws).
 * Friendly copy and a retry button — never the stack trace, which can contain record data.
 */
export function PortalErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  const theme = useTheme();
  return (
    <View role="main" style={[styles.screen, { backgroundColor: theme.background }]}>
      <View role="alert" style={styles.alertWrap}>
      <AppMark size={56} />
      <Text role="heading" {...webProps({ 'aria-level': 1 })} style={[styles.title, { color: theme.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        This page couldn’t be displayed. Your records are safe. Try again, and if it keeps happening, sign out and back in.
      </Text>
      </View>
      <Button label="Try again" icon="refresh" portal onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space[7], gap: Space[4] },
  alertWrap: { alignItems: 'center', gap: Space[4] },
  title: { fontSize: 24, lineHeight: 30, fontFamily: Fonts.sans.bold, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 23, fontFamily: Fonts.sans.regular, textAlign: 'center', maxWidth: 440 },
});
