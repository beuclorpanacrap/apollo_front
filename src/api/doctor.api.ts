import { apiClient } from './client';
import { components } from './types';
import type { VisionPrescriptionResponse } from './vision.types';
// `visionPrescriptions` is not in the generated schema yet (see vision.types.ts); drop the extension once it is.
export type UnlockedVault = components['schemas']['UnlockedVaultResponse'] & {
  /** Glasses prescriptions issued to the patient (accessible to clinicians). */
  visionPrescriptions?: VisionPrescriptionResponse[];
};
// Health records and PINs live only in memory.
export let activeVault: UnlockedVault | null = null;
let vaults: UnlockedVault[] = [];
export function isVaultValid(vault: UnlockedVault) {
  return !!vault.sessionExpiresAt && Date.parse(vault.sessionExpiresAt) > Date.now();
}
export function getUnlockedVaults() {
  vaults = vaults.filter(isVaultValid);
  if (activeVault && !isVaultValid(activeVault)) activeVault = null;
  return vaults;
}
export function clearActiveVault() { activeVault = null; vaults = []; }
export function setActiveVault(next: UnlockedVault | null) {
  activeVault = next;
  if (next && isVaultValid(next)) {
    vaults = [...getUnlockedVaults().filter(item => next.patient?.id ? item.patient?.id !== next.patient.id : item !== next), next];
  }
}
export function removeUnlockedVault(vault: UnlockedVault) {
  vaults = vaults.filter(item => item !== vault);
  if (activeVault === vault) activeVault = null;
}
export const doctorApi = {
  async unlock(accessCode: string) {
    // The caller retains only accepted responses; cancelled requests must not cache patient records.
    return apiClient<UnlockedVault>('/api/v1/doctor/vault/unlock', { method: 'POST', body: { accessCode } });
  },
};
