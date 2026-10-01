import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { DoctorProfile } from '@/components/doctor-profile';
import { DoctorWebOnly } from '@/components/doctor-web-only';
import { useAuth } from '@/context/auth-context';
export default function DoctorProfileScreen() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  if (Platform.OS !== 'web') return <DoctorWebOnly onSignOut={logout} />;
  return <DoctorProfile />;
}
