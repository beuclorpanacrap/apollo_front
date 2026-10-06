import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function DoctorDashboard(_props: { vaultView?: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Doctor dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Record a structured test result for a patient.
        </Text>
        <Button
          label="Add test result"
          icon="add"
          onPress={() => router.push('/vault/add-lab-result')}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontFamily: Fonts.sans.regular,
    fontSize: 15,
    marginBottom: Spacing.two,
  },
});
