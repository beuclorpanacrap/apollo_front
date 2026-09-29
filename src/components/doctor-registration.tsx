import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { openDoctorRegistrationWebsite } from '@/utils/doctor-registration-link';

export default function DoctorRegistration() {
  const theme = useTheme();
  const router = useRouter();
  const opened = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const openRegistration = async () => {
    setError(null);
    try {
      await openDoctorRegistrationWebsite();
      router.replace('/sign-up');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    }
  };

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void openRegistration();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20, backgroundColor: theme.background }}>
      {error ? <>
        <Text accessibilityRole="alert" style={{ color: theme.danger, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={openRegistration} style={{ padding: 16 }}>
          <Text style={{ color: theme.tintStrong }}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/sign-up')} style={{ padding: 16 }}>
          <Text style={{ color: theme.text }}>Back to sign-up</Text>
        </TouchableOpacity>
      </> : <>
        <ActivityIndicator color={theme.tint} />
        <Text style={{ color: theme.text }}>Opening doctor registration…</Text>
      </>}
    </View>
  );
}
