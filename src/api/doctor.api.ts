import { apiClient } from './client';
import { components } from './types';
import type { VisionPrescriptionResponse } from './vision.types';
// `visionPrescriptions` is not in the generated schema yet (see vision.types.ts); drop the extension once it is.
export type UnlockedVault = components['schemas']['UnlockedVaultResponse'] & {
  /** Glasses prescriptions issued to the patient (accessible to clinicians). */
  visionPrescriptions?: VisionPrescriptionResponse[];
};
// Health records and PINs are never persisted in browser storage.
export let activeVault: UnlockedVault | null = null;
export function clearActiveVault() { activeVault = null; }
// Additive (clinician redesign): lets the vault context write immutable updates back so the unlocked
// vault survives Dashboard → Profile → Dashboard. `unlock`, `clearActiveVault` and the endpoints are unchanged.
export function setActiveVault(next: UnlockedVault | null) { activeVault = next; }
export const doctorApi = {
  async unlock(accessCode: string) {
    const result = await apiClient<UnlockedVault>('/api/v1/doctor/vault/unlock', { method: 'POST', body: { accessCode } });
    activeVault = result;
    return result;
  },
};
