import { useAuth } from '@/context/auth-context';
import { useVault } from '@/context/vault-context';
import { summarizePanel } from '@/utils/lab-trends';
import { patientContext } from '@/utils/patient-context';
import { getTemplate } from '@/components/templates';
import NewLabResultScreen from '@/components/screens/NewLabResultScreen';
import type { LabResultPayload } from '@/components/types';

export default function AddLabResultScreen() {
  const { addLabResult } = useVault();
  const { user } = useAuth();

  async function save(payload: LabResultPayload) {
    const template = getTemplate(payload.templateCode);
    await addLabResult({
      mode: 'freeform',
      testName: template?.name ?? payload.templateCode,
      freeformResult: summarizePanel(payload.entries),
      panel: {
        templateCode: payload.templateCode,
        templateVersion: payload.templateVersion,
        status: payload.status,
        entries: payload.entries,
      },
      dateAdded: payload.takenOn,
    });
  }

  return <NewLabResultScreen patient={patientContext(user ?? {})} onSave={save} />;
}
