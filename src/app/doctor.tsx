import { Redirect } from 'expo-router';
import { DoctorWebOnly } from '@/components/doctor-web-only';
import { useAuth } from '@/context/auth-context';

// Native: the clinical workspace is web-only (see ./doctor.web.tsx).
export default function DoctorScreen() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  return <DoctorWebOnly onSignOut={logout} />;
}
