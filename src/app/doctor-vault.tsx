import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { DoctorWebOnly } from '@/components/doctor-web-only';
import { useAuth } from '@/context/auth-context';

// Alias route: on web the vault lives inside the /doctor workspace.
export default function DoctorVaultScreen() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  if (Platform.OS !== 'web') return <DoctorWebOnly onSignOut={logout} />;
  return <Redirect href="/doctor" />;
}
