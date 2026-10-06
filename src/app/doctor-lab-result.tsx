import { Redirect } from 'expo-router';

import { activeVault } from '@/api/doctor.api';
import { apiClient } from '@/api/client';
import NewLabResultScreen from '@/components/screens/NewLabResultScreen';
import { allFields } from '@/components/evaluate';
import { getTemplate } from '@/components/templates';
import type { LabResultPayload, PatientContext } from '@/components/types';
import { useAuth } from '@/context/auth-context';

// Reference ranges follow the patient's sex and age; anything the profile doesn't say is left unknown.
function patientContext(patient: { gender?: string; dateOfBirth?: string }): PatientContext {
  const gender = patient.gender?.toUpperCase();
  const sex = gender === 'FEMALE' ? 'female' : gender === 'MALE' ? 'male' : undefined;
  let ageYears: number | undefined;
  const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined;
  if (dob && !Number.isNaN(dob.getTime())) {
    const now = new Date();
    ageYears = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) ageYears -= 1;
  }
  return { sex, ageYears };
}

export default function DoctorLabResultScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  if (!activeVault?.patient?.id) return <Redirect href="/doctor" />;
  const vault = activeVault;
  const patientId = activeVault.patient.id;

  // The backend stores one numeric value per record, so each numeric entry becomes its own test result.
  async function save(payload: LabResultPayload) {
    const template = getTemplate(payload.templateCode);
    const labels = new Map((template ? allFields(template) : []).map((f) => [f.key, f.label] as const));
    const recordedAt = new Date(`${payload.takenOn}T00:00:00`).toISOString();
    for (const entry of payload.entries) {
      if (typeof entry.value !== 'number') continue;
      const result = await apiClient<any>('/api/v1/doctor/test-results', {
        method: 'POST',
        body: {
          patientId,
          testName: labels.get(entry.key) ?? entry.key,
          numericValue: entry.value,
          unit: entry.unit ?? '',
          recordedAt,
        },
      });
      vault.testResults = [...(vault.testResults ?? []), result];
    }
  }

  return <NewLabResultScreen patient={patientContext(vault.patient ?? {})} onSave={save} />;
}
