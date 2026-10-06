import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { openDoctorRegistrationWebsite } from '../utils/doctor-registration-link';

export function useDoctorRegistration() {
  const router = useRouter();
  return async () => {
    if (Platform.OS === 'web') {
      router.push('/register-doctor');
      return;
    }
    try {
      await openDoctorRegistrationWebsite();
    } catch (error) {
      Alert.alert('Unable to open registration', error instanceof Error ? error.message : 'Please try again.');
    }
  };
}
