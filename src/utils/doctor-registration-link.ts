import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

export function getDoctorRegistrationUrl(): string {
  let baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();
  // Expo's development server also serves the web application on the LAN.
  // Use its actual host so a physical phone does not open its own localhost.
  if (!baseUrl && __DEV__ && Constants.expoConfig?.hostUri) {
    baseUrl = `http://${Constants.expoConfig.hostUri}`;
  }
  if (!baseUrl) throw new Error('Doctor registration is not available yet. Please try again later.');
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) {
    throw new Error('The registration website could not be opened.');
  }
  return new URL('/register-doctor', url).toString();
}

export async function openDoctorRegistrationWebsite(): Promise<void> {
  await Linking.openURL(getDoctorRegistrationUrl());
}
