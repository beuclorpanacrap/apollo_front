import { useVault } from '@/context/vault-context';
import { getTemplate } from '@/components/templates';
import NewLabResultScreen from '@/components/screens/NewLabResultScreen';
import type { LabResultPayload } from '@/components/types';

export default function AddLabResultScreen() {
  const { addLabResult } = useVault();

  async function save(payload: LabResultPayload) {
    const template = getTemplate(payload.templateCode);
    await addLabResult({
      mode: 'freeform',
      testName: template?.name ?? payload.templateCode,
      freeformResult: JSON.stringify(payload.entries),
      dateAdded: payload.takenOn,
    });
  }

  return <NewLabResultScreen onSave={save} />;
}
