import type { PatientContext } from '../components/types';

/**
 * Reference ranges follow the patient's sex and age. Anything the profile
 * doesn't say is left unknown, and ranges that depend on it are skipped.
 */
export function patientContext(profile: { gender?: string; dateOfBirth?: string }): PatientContext {
  const gender = profile.gender?.toUpperCase();
  const sex = gender === 'FEMALE' ? 'female' : gender === 'MALE' ? 'male' : undefined;

  let ageYears: number | undefined;
  const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined;
  if (dob && !Number.isNaN(dob.getTime())) {
    const now = new Date();
    ageYears = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) {
      ageYears -= 1;
    }
  }
  return { sex, ageYears };
}
