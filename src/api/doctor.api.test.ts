import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { activeVault, clearActiveVault, getUnlockedVaults, removeUnlockedVault, replaceUnlockedVaults, setActiveVault, type UnlockedVault } from './doctor.api';

jest.mock('./client', () => ({ apiClient: jest.fn() }));
const patient = (id: string, expires = Date.now() + 60_000): UnlockedVault => ({ patient: { id }, sessionExpiresAt: new Date(expires).toISOString() });
afterEach(() => { clearActiveVault(); jest.useRealTimers(); });

describe('unlocked patient sessions', () => {
  it('restores server connections without storing or selecting a PIN', () => {
    const first = patient('first'), second = patient('second');
    expect(replaceUnlockedVaults([first, second])).toEqual([first, second]);
    expect(activeVault).toBeNull();
  });
  it('removes revoked patients and refreshes the selected patient from server state', () => {
    const first = patient('first'), second = patient('second');
    setActiveVault(first); setActiveVault(second);
    const updated = { ...second, prescriptions: [{ id: 'new' }] };
    replaceUnlockedVaults([updated]);
    expect(activeVault).toBe(updated);
    expect(getUnlockedVaults()).toEqual([updated]);
    replaceUnlockedVaults([]);
    expect(activeVault).toBeNull();
    expect(getUnlockedVaults()).toEqual([]);
  });
  it('keeps both patients while selecting another vault or returning to PIN entry', () => {
    const first = patient('first'), second = patient('second');
    setActiveVault(first); setActiveVault(second); setActiveVault(first);
    expect(activeVault).toBe(first);
    expect(getUnlockedVaults()).toHaveLength(2);
    setActiveVault(null);
    expect(activeVault).toBeNull();
    expect(getUnlockedVaults()).toHaveLength(2);
  });
  it('replaces a patient snapshot without duplicating the patient or losing other records', () => {
    const first = patient('first'), second = patient('second');
    setActiveVault(first); setActiveVault(second);
    const updated = { ...first, testResults: [{ id: 'result', testName: 'Glucose' }] };
    setActiveVault(updated);
    expect(getUnlockedVaults()).toEqual([second, updated]);
  });
  it('expires inactive sessions independently and clears an expired selection', () => {
    jest.useFakeTimers();
    const first = patient('first', Date.now() + 1000), second = patient('second');
    setActiveVault(first); setActiveVault(second);
    jest.advanceTimersByTime(1001);
    expect(getUnlockedVaults()).toEqual([second]);
    expect(activeVault).toBe(second);
    jest.advanceTimersByTime(60_000);
    expect(getUnlockedVaults()).toEqual([]);
    expect(activeVault).toBeNull();
  });
  it('closes only the requested patient and clears all sessions on sign-out', () => {
    const first = patient('first'), second = patient('second');
    setActiveVault(first); setActiveVault(second);
    removeUnlockedVault(second);
    expect(getUnlockedVaults()).toEqual([first]);
    expect(activeVault).toBeNull();
    clearActiveVault();
    expect(getUnlockedVaults()).toEqual([]);
  });
});
