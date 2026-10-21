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
/** Reconcile with server authorization; never persist patient records or PINs in browser storage. */
export function replaceUnlockedVaults(next: UnlockedVault[]) {
  const selectedId = activeVault?.patient?.id;
  vaults = next.filter(isVaultValid);
  activeVault = vaults.find(item => item.patient?.id === selectedId) ?? null;
  return vaults;
}
export function setActiveVault(next: UnlockedVault | null) {
  activeVault = next;
  if (next && isVaultValid(next)) {
    vaults = [...getUnlockedVaults().filter(item => next.patient?.id ? item.patient?.id !== next.patient.id : item !== next), next];
  }
}
export function removeUnlockedVault(vault: UnlockedVault) {
  const matches = (item: UnlockedVault) => item === vault || (!!vault.patient?.id && item.patient?.id === vault.patient.id);
  vaults = vaults.filter(item => !matches(item));
  if (activeVault && matches(activeVault)) activeVault = null;
}
export const doctorApi = {
  listVaults() {
    return apiClient<UnlockedVault[]>('/api/v1/doctor/vault/sessions', { cache: 'no-store' });
  },
  disconnect(patientId: string) {
    return apiClient<void>(`/api/v1/doctor/vault/patients/${encodeURIComponent(patientId)}`, { method: 'DELETE' });
  },
  async unlock(accessCode: string) {
    // The caller retains only accepted responses; cancelled requests must not cache patient records.
    return apiClient<UnlockedVault>('/api/v1/doctor/vault/unlock', { method: 'POST', body: { accessCode } });
  },
};
