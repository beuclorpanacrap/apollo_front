import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

function resolveWebBaseUrl(unavailable: string, unopenable: string): URL {
  let baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();
  // Expo's development server also serves the web application on the LAN.
  // Use its actual host so a physical phone does not open its own localhost.
  if (!baseUrl && __DEV__ && Constants.expoConfig?.hostUri) {
    baseUrl = `http://${Constants.expoConfig.hostUri}`;
  }
  if (!baseUrl) throw new Error(unavailable);
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) {
    throw new Error(unopenable);
  }
  return url;
}

export function getDoctorRegistrationUrl(): string {
  const url = resolveWebBaseUrl(
    'Doctor registration is not available yet. Please try again later.',
    'The registration website could not be opened.',
  );
  return new URL('/register-doctor', url).toString();
}

/** Where a signed-in clinician is sent from the native app (the clinical workspace is web-only). */
export function getClinicianWorkspaceUrl(): string {
  const url = resolveWebBaseUrl(
    'The Apollo website address is not configured yet. Please open Apollo in your computer’s browser.',
    'The Apollo website could not be opened.',
  );
  return new URL('/doctor', url).toString();
}

export async function openDoctorRegistrationWebsite(): Promise<void> {
  await Linking.openURL(getDoctorRegistrationUrl());
}
