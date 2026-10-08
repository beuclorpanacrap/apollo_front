import { AppMark } from '@/components/app-mark';
import { AppTheme, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDoctorRegistration } from '@/hooks/use-doctor-registration';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const openDoctorRegistration = useDoctorRegistration();
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/welcome')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={theme.tintStrong} />
          <Text style={styles.link}>Back to Apollo</Text>
        </TouchableOpacity>
        <View style={styles.heading}>
          <AppMark size={64} />
          <Text style={styles.title}>Welcome to Apollo</Text>
          <Text style={styles.subtitle}>Choose how you will use Apollo to create the right account.</Text>
        </View>
        <View style={styles.roles}>
          <TouchableOpacity accessibilityRole="button" style={styles.card} onPress={() => router.push('/register-patient')}>
            <Image source={require('../../assets/images/patient_icon.png')} style={styles.icon} />
            <Text style={styles.roleTitle}>Patient</Text>
            <Text style={styles.description}>Manage your health records and share them with your care team.</Text>
            <Text style={styles.badge}>Mobile & web</Text>
            <View style={styles.action}><Text style={styles.link}>Create patient account</Text><Ionicons name="arrow-forward" size={18} color={theme.tintStrong} /></View>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.card} onPress={openDoctorRegistration}>
            <Image source={require('../../assets/images/doctor_icon.png')} style={styles.icon} />
            <Text style={styles.roleTitle}>Doctor</Text>
            <Text style={styles.description}>Access the clinical workspace for patient records and consultations.</Text>
            <Text style={styles.badge}>Web only</Text>
            <View style={styles.action}><Text style={styles.link}>Create doctor account</Text><Ionicons name="arrow-forward" size={18} color={theme.tintStrong} /></View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/sign-in')} style={styles.footer}>
          <Text style={styles.subtitle}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, maxWidth: 920, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, marginBottom: 24, alignSelf: 'flex-start' },
  heading: { alignItems: 'center', gap: 16, marginBottom: 32 },
  title: { fontFamily: Fonts.display, fontSize: 30, color: theme.text, textAlign: 'center' },
  subtitle: { fontFamily: Fonts.sans.regular, fontSize: 15, lineHeight: 23, color: theme.textSecondary, textAlign: 'center' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { flexGrow: 1, flexBasis: 300, padding: 28, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement, borderRadius: 20, gap: 14 },
  icon: { width: 68, height: 68, resizeMode: 'contain' },
  roleTitle: { fontFamily: Fonts.sans.bold, fontSize: 24, color: theme.text },
  description: { fontFamily: Fonts.sans.regular, fontSize: 15, lineHeight: 23, color: theme.textSecondary },
  badge: { fontFamily: Fonts.sans.medium, color: theme.pillGreenText, backgroundColor: theme.pillGreenBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start', fontSize: 12 },
  action: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 },
  link: { color: theme.tintStrong, fontFamily: Fonts.sans.semiBold, fontSize: 14 },
  footer: { paddingVertical: 28 },
});
