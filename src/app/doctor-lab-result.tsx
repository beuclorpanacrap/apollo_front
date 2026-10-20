import { Redirect } from 'expo-router';

import { apiClient } from '@/api/client';
import NewLabResultScreen from '@/components/screens/NewLabResultScreen';
import { allFields } from '@/components/evaluate';
import { getTemplate } from '@/components/templates';
import type { LabResultPayload } from '@/components/types';
import { useAuth } from '@/context/auth-context';
import { useClinicianVault } from '@/context/clinician-vault-context';
import { patientContext } from '@/utils/patient-context';
import { recordedAtFor } from '@/utils/recorded-at';

export default function DoctorLabResultScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { vault, addRecord } = useClinicianVault();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  if (!vault?.patient?.id) return <Redirect href="/doctor" />;
  const patientId = vault.patient.id;

  // The backend stores one exact numeric value per record, so each numeric entry becomes its own test result.
  // Choice and text entries, and censored values ("<0.5", which has no exact number), are not sent.
  async function save(payload: LabResultPayload) {
    const template = getTemplate(payload.templateCode);
    const labels = new Map((template ? allFields(template) : []).map((f) => [f.key, f.label] as const));
    // Every value of one submission shares this timestamp: the chosen day plus the current time.
    // The patient's app uses it to put the values back together as one result.
    const recordedAt = recordedAtFor(payload.takenOn);
    for (const entry of payload.entries) {
      if (typeof entry.value !== 'number' || entry.qualifier) continue;
      const result = await apiClient<any>('/api/v1/doctor/test-results', {
        method: 'POST',
        body: {
          patientId,
          testName: entry.label ?? labels.get(entry.key) ?? entry.key,
          numericValue: entry.value,
          unit: entry.unit ?? '',
          recordedAt,
        },
      });
      // Appends immutably and flags the record as just added, so the clinician portal updates and highlights it.
      addRecord('lab', result);
    }
  }

  return <NewLabResultScreen mode="doctor" patient={patientContext(vault.patient ?? {})} onSave={save} />;
}
