import { apiClient } from './client';
import { components } from './types';
export type UnlockedVault = components['schemas']['UnlockedVaultResponse'];
// Health records and PINs are never persisted in browser storage.
export let activeVault: UnlockedVault | null = null;
export let unlockedVaults: UnlockedVault[] = [];
export function isVaultValid(vault: UnlockedVault) {
  return !!vault.sessionExpiresAt && Date.parse(vault.sessionExpiresAt) > Date.now();
}
export function getUnlockedVaults() {
  unlockedVaults = unlockedVaults.filter(isVaultValid);
  if (activeVault && !unlockedVaults.includes(activeVault)) activeVault = null;
  return unlockedVaults;
}
export function selectVault(vault: UnlockedVault | null) { activeVault = vault; }
export function removeVault(vault: UnlockedVault) {
  unlockedVaults = unlockedVaults.filter(item => item !== vault);
  if (activeVault === vault) activeVault = null;
}
export function clearActiveVault() { activeVault = null; unlockedVaults = []; }
export const doctorApi = {
  async unlock(accessCode: string) {
    const result = await apiClient<UnlockedVault>('/api/v1/doctor/vault/unlock', { method: 'POST', body: { accessCode } });
    getUnlockedVaults();
    unlockedVaults = [...unlockedVaults.filter(item => !result.patient?.id || item.patient?.id !== result.patient.id), result];
    activeVault = result;
    return result;
  },
};
