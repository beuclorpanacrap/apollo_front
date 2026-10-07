import { Redirect } from 'expo-router';

import { activeVault } from '@/api/doctor.api';
import { apiClient } from '@/api/client';
import NewLabResultScreen from '@/components/screens/NewLabResultScreen';
import { allFields } from '@/components/evaluate';
import { getTemplate } from '@/components/templates';
import type { LabResultPayload } from '@/components/types';
import { useAuth } from '@/context/auth-context';
import { patientContext } from '@/utils/patient-context';

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
    // Every value of one submission shares this timestamp: the chosen day plus the current time.
    // The patient's app uses it to put the values back together as one result.
    const [y, m, d] = payload.takenOn.split('-').map(Number);
    const now = new Date();
    const recordedAt = new Date(y!, m! - 1, d!, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
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
