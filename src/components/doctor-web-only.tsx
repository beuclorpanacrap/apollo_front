import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { AppMark } from './app-mark';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Fonts, Radii, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getClinicianWorkspaceUrl } from '@/utils/doctor-registration-link';

/**
 * Native notice: the clinical workspace is a desktop web experience. Shows where to go (selectable URL),
 * opens it on request and explains plainly if the address can't be resolved or opened.
 */
export function DoctorWebOnly({ onSignOut }: { onSignOut?: () => Promise<void> }) {
  const theme = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  let url: string | null = null;
  try {
    url = getClinicianWorkspaceUrl();
  } catch {
    url = null;
  }

  const openWebsite = async () => {
    setError(null);
    try {
      await Linking.openURL(getClinicianWorkspaceUrl());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apollo could not be opened. Please open it in your computer’s browser.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <AppMark size={64} />
      <Text role="heading" style={[styles.title, { color: theme.text }]}>
        Apollo for clinicians
      </Text>
      <Text style={[styles.description, { color: theme.textMuted }]}>
        Doctor registration and the clinical workspace are available on the Apollo website. Open Apollo in your computer’s
        browser to continue. The mobile app is for patients.
      </Text>

      {url ? (
        <View style={[styles.url, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.urlLabel, { color: theme.textMuted }]}>Website address</Text>
          <Text selectable style={[styles.urlText, { color: theme.text }]}>
            {url}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.alert}>
          <InlineAlert tone="error">{error}</InlineAlert>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Open Apollo on the web" icon="open-outline" portal fullWidth onPress={openWebsite} />
        <Button
          label={onSignOut ? 'Sign out' : 'Back to Apollo'}
          variant="ghost"
          portal
          fullWidth
          onPress={async () => {
            if (onSignOut) await onSignOut();
            router.replace('/welcome');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Space[7], gap: Space[4] },
  title: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 24, lineHeight: 30, textAlign: 'center' },
  description: { fontFamily: Fonts.sans.regular, fontSize: 16, lineHeight: 25, maxWidth: 460, textAlign: 'center' },
  url: { maxWidth: 460, width: '100%', padding: Space[4], borderRadius: Radii.md, borderWidth: 1, gap: 2 },
  urlLabel: { fontFamily: Fonts.sans.medium, fontWeight: '500', fontSize: 12, lineHeight: 16 },
  urlText: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 15, lineHeight: 22 },
  alert: { maxWidth: 460, width: '100%' },
  actions: { maxWidth: 460, width: '100%', gap: Space[3], marginTop: Space[2] },
});
