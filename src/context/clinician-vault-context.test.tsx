import React, { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { clearActiveVault, doctorApi, type UnlockedVault } from '@/api/doctor.api';
import { ClinicianVaultProvider, useClinicianVault } from './clinician-vault-context';

let mockUser: { userId: string; role: string } | null = { userId: 'doctor', role: 'ROLE_DOCTOR' };
jest.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/api/client', () => ({ apiClient: jest.fn() }));

const patient = (id: string): UnlockedVault => ({
  patient: { id }, activeSessionId: `session-${id}`,
  sessionExpiresAt: new Date(Date.now() + 60_000).toISOString(),
});
const wrapper = ({ children }: { children: ReactNode }) => <ClinicianVaultProvider>{children}</ClinicianVaultProvider>;

beforeEach(() => {
  jest.useFakeTimers();
  mockUser = { userId: 'doctor', role: 'ROLE_DOCTOR' };
  clearActiveVault();
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); clearActiveVault(); });

describe('server-backed clinician connections', () => {
  it('restores multiple patients and removes a revoked selected patient on refresh', async () => {
    const first = patient('first'), second = patient('second');
    const list = jest.spyOn(doctorApi, 'listVaults').mockResolvedValue([first, second]);
    const { result } = await renderHook(useClinicianVault, { wrapper });
    await act(async () => {});
    expect(result.current.vaults).toEqual([first, second]);
    await act(() => result.current.select(first));
    list.mockResolvedValue([second]);
    await act(async () => { jest.advanceTimersByTime(15_000); });
    expect(result.current.vaults).toEqual([second]);
    expect(result.current.vault).toBeNull();
    expect(result.current.expired).toBe(true);
  });

  it('ignores a response that arrives after another account signs in', async () => {
    let resolveOld!: (vaults: UnlockedVault[]) => void;
    jest.spyOn(doctorApi, 'listVaults')
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue([]);
    const { result, rerender } = await renderHook(useClinicianVault, { wrapper });
    mockUser = { userId: 'different-doctor', role: 'ROLE_DOCTOR' };
    await rerender({});
    await act(async () => { resolveOld([patient('old-account-patient')]); });
    expect(result.current.vaults).toEqual([]);
    expect(result.current.vault).toBeNull();
  });

  it('does not replace a newly unlocked patient with an earlier in-flight list', async () => {
    let resolveList!: (vaults: UnlockedVault[]) => void;
    jest.spyOn(doctorApi, 'listVaults').mockImplementation(() => new Promise(resolve => { resolveList = resolve; }));
    const { result } = await renderHook(useClinicianVault, { wrapper });
    const newlyUnlocked = patient('new');
    await act(() => result.current.open(newlyUnlocked));
    await act(async () => { resolveList([]); });
    expect(result.current.vault).toBe(newlyUnlocked);
    expect(result.current.vaults).toEqual([newlyUnlocked]);
  });

  it('disconnects on the server when the doctor closes a patient', async () => {
    const first = patient('first');
    jest.spyOn(doctorApi, 'listVaults').mockResolvedValue([first]);
    const disconnect = jest.spyOn(doctorApi, 'disconnect').mockResolvedValue(undefined);
    const { result } = await renderHook(useClinicianVault, { wrapper });
    await act(async () => {});
    await act(() => result.current.select(first));
    await act(async () => { result.current.closeCurrent(); });
    expect(disconnect).toHaveBeenCalledWith('first');
    expect(result.current.vaults).toEqual([]);
    expect(result.current.vault).toBeNull();
  });

  it('clears cached patient records if server authorization cannot be refreshed', async () => {
    const first = patient('first');
    const list = jest.spyOn(doctorApi, 'listVaults').mockResolvedValue([first]);
    const { result } = await renderHook(useClinicianVault, { wrapper });
    await act(() => result.current.select(first));
    list.mockRejectedValue(new Error('offline'));
    await act(async () => { jest.advanceTimersByTime(15_000); });
    expect(result.current.vaults).toEqual([]);
    expect(result.current.vault).toBeNull();
  });

  it('keeps newly added records when switching between patients', async () => {
    const first = patient('first'), second = patient('second');
    jest.spyOn(doctorApi, 'listVaults').mockResolvedValue([first, second]);
    const { result } = await renderHook(useClinicianVault, { wrapper });
    await act(() => result.current.select(first));
    await act(() => result.current.addRecord('prescription', { id: 'saved-prescription' }));
    const updated = result.current.vaults.find(item => item.patient?.id === 'first')!;
    await act(() => result.current.select(second));
    await act(() => result.current.select(updated));
    expect(result.current.vault?.prescriptions).toEqual([{ id: 'saved-prescription' }]);
  });
});
