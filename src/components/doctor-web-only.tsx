import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppMark } from './app-mark';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function DoctorWebOnly({ onSignOut }: { onSignOut?: () => Promise<void> }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <AppMark size={64} />
      <Text style={[styles.title, { color: theme.text }]}>Apollo for clinicians</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Doctor registration and the clinical workspace are available on the Apollo website.
        Open Apollo in your computer’s browser to continue. The mobile app is for patients.
      </Text>
      <TouchableOpacity accessibilityRole="button" style={[styles.button, { backgroundColor: theme.tint }]}
        onPress={async () => { if (onSignOut) await onSignOut(); router.replace('/welcome'); }}>
        <Text style={{ color: theme.onTint, fontFamily: Fonts.sans.semiBold }}>{onSignOut ? 'Sign out' : 'Back to Apollo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 20 },
  title: { fontFamily: Fonts.sans.bold, fontSize: 24, textAlign: 'center' },
  description: { fontFamily: Fonts.sans.regular, fontSize: 16, lineHeight: 25, maxWidth: 460, textAlign: 'center' },
  button: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
});
