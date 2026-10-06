import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function IndexRoute() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.centerSection}>
          <Text style={styles.appTitle}>Apollo</Text>
          <Text style={styles.subtitle}>Keep your health records in one place.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/sign-in')}>
            <Ionicons name="log-in" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/sign-up')}>
            <Ionicons name="person-add" size={19} color="#2E5C40" />
            <Text style={styles.secondaryText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doctorLink} onPress={() => router.push('/register-doctor')}>
            <Text style={styles.doctorText}>Doctor & clinician portal →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FBF6E8' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerSection: { alignItems: 'center', marginBottom: 48 },
  appTitle: { color: '#2E5C40', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#6E7F73', fontSize: 15, marginTop: 8, textAlign: 'center' },
  actions: { gap: 12 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#4FAE72',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E4F2E8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  secondaryText: { color: '#2E5C40', fontSize: 16, fontWeight: '700' },
  doctorLink: { alignItems: 'center', paddingVertical: 10 },
  doctorText: { color: '#819088', fontSize: 13 },
});
