import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import { AppMark } from '@/components/app-mark';
import { DoctorWebOnly } from '@/components/doctor-web-only';
import { useAuth } from '@/context/auth-context';
import { useThemeContext } from '@/context/theme-context';
import { Fonts } from '@/constants/theme';

// Registration landing page; clinical workflows will live in the doctor portal.
export default function DoctorAccountScreen() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, themeMode, setThemeMode } = useThemeContext();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  if (Platform.OS !== 'web') return <DoctorWebOnly onSignOut={logout} />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <AppMark size={36} />
        <Text style={[styles.brand, { color: theme.text }]}>Apollo <Text style={{ color: theme.textSecondary }}> / Clinicians</Text></Text>
        <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => setThemeMode(themeMode === 'Dark' ? 'Light' : 'Dark')}>
          <Text style={{ color: theme.tintStrong }}>Change theme</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={logout}><Text style={{ color: theme.tintStrong }}>Sign out</Text></TouchableOpacity>
      </View>
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.eyebrow, { color: theme.tintStrong }]}>DOCTOR ACCOUNT</Text>
        <Text style={[styles.title, { color: theme.text }]}>Welcome, {user.fullName || 'Doctor'}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{user.email}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>You’re signed in to your doctor account. The clinical workspace is not available yet.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, paddingHorizontal: 32, paddingVertical: 18, borderBottomWidth: 1 },
  brand: { fontFamily: Fonts.sans.bold, fontSize: 18, flex: 1 },
  action: { padding: 10 },
  card: { alignSelf: 'center', width: '90%', maxWidth: 720, marginTop: 64, padding: 32, borderRadius: 16, borderWidth: 1, gap: 16 },
  eyebrow: { fontFamily: Fonts.sans.semiBold, fontSize: 12, letterSpacing: 2 },
  title: { fontFamily: Fonts.sans.bold, fontSize: 28 },
  body: { fontFamily: Fonts.sans.regular, fontSize: 16, lineHeight: 25 },
});
