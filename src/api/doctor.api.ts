import { apiClient } from './client';
import { components } from './types';
export type UnlockedVault = components['schemas']['UnlockedVaultResponse'];
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
