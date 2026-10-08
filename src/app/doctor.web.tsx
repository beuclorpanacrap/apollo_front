import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';

import { ApiError } from '@/api/client';
import { clearActiveVault, doctorApi, setActiveVault, type UnlockedVault } from '@/api/doctor.api';
import { AddRecordDialog, type SavedRecord } from '@/components/portal/add-record-dialog';
import { LockedView } from '@/components/portal/locked-view';
import { PortalLoading } from '@/components/portal/portal-loading';
import { PortalShell, useNavLock } from '@/components/portal/portal-shell';
import { VaultView, type VaultTab } from '@/components/portal/vault-view';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { useClinicianVault, type RecordKind } from '@/context/clinician-vault-context';
import { prefersReducedMotionNow } from '@/hooks/use-reduced-motion';
import { canRecordLabs, fullName } from '@/utils/clinician-format';
import { clinicianSignInHref } from '@/utils/portal-routes';

export { PortalErrorBoundary as ErrorBoundary } from '@/components/portal/route-error';

// Route entry (web). Native builds use ./doctor.tsx, which shows the web-only notice.
const TITLE = 'Clinician workspace · Apollo'; // never put patient names (PHI) in the tab title

export default function DoctorScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PortalLoading title={TITLE} />;
  if (!isAuthenticated) return <Redirect href={clinicianSignInHref('/doctor')} />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  return (
    <PortalShell active="dashboard" title={TITLE}>
      <DoctorDashboard />
    </PortalShell>
  );
}

const TAB_FOR: Record<RecordKind, VaultTab> = { encounter: 'encounters', prescription: 'prescriptions', lab: 'labs' };
const NOUN: Record<RecordKind, string> = { encounter: 'Encounter', prescription: 'Prescription', lab: 'Lab result' };
const SLOW_AFTER_MS = 8000;

function DoctorDashboard() {
  const { user, logout, updateUserLocally } = useAuth();
  const { vault, open, close, addRecord, recentIds, expired, acknowledgeExpiry } = useClinicianVault();
  const router = useRouter();
  const toast = useToast();

  // Specialty preference lives in this browser only (non-PHI); mirror it into the signed-in user, as before.
  useEffect(() => {
    if (!user?.userId) return;
    try {
      const saved = localStorage.getItem(`apollo_doctor_specialty_${user.userId}`);
      if (saved !== null && saved !== user.specialty) updateUserLocally({ specialty: saved });
    } catch {
      /* Browser preferences are optional. */
    }
  }, [user?.userId, user?.specialty, updateUserLocally]);

  // ---- unlock state (logic unchanged from the original dashboard) -------------------------------
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [status, setStatus] = useState<'idle' | 'validating'>('idle');
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);
  const [focusPin, setFocusPin] = useState(0);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const alive = useRef(true);
  const busy = useRef(false);
  const requestId = useRef(0);
  const latestVault = useRef<UnlockedVault | null>(vault);

  useEffect(() => {
    latestVault.current = vault;
  }, [vault]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The server may be a cold-start free tier: after 8s, say so instead of looking frozen.
  useEffect(() => {
    if (status !== 'validating') {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [status]);

  // Expiry: the dialog announces it; the inline notice stays on the locked view until the next PIN edit.
  useEffect(() => {
    if (expired) setExpiredNotice(true);
  }, [expired]);

  useNavLock(status === 'validating');

  const canLab = canRecordLabs(user?.doctorRole);

  // Add-record dialog + active records tab.
  const [entry, setEntry] = useState<{ kind: RecordKind; key: number } | null>(null);
  const [tab, setTab] = useState<VaultTab>('conditions');

  const signOut = async () => {
    alive.current = false;
    close();
    await logout();
  };

  const unlock = async () => {
    const code = digits.join('');
    if (busy.current || vault || code.length !== 6) return;
    const id = ++requestId.current;
    busy.current = true;
    setStatus('validating');
    setError('');
    try {
      const unlocked = await doctorApi.unlock(code);
      // Cancelled or unmounted while waiting: drop the response (and the module-level copy it just wrote).
      if (!alive.current || id !== requestId.current) {
        if (latestVault.current) setActiveVault(latestVault.current);
        else clearActiveVault();
        return;
      }
      setDigits(Array(6).fill(''));
      setExpiredNotice(false);
      setStatus('idle');
      open(unlocked);
    } catch (e) {
      if (!alive.current || id !== requestId.current) return;
      setStatus('idle');
      if (e instanceof ApiError && e.status === 401) {
        await signOut();
        return;
      }
      setError(
        e instanceof ApiError && e.status === 400
          ? 'This PIN is invalid, expired, or already used. Ask the patient to generate a new PIN.'
          : e instanceof ApiError && e.status === 403
            ? 'Your account does not have permission to unlock this vault.'
            : 'The vault could not be reached. Please try again.',
      );
      setDigits(Array(6).fill(''));
      setFocusPin((n) => n + 1);
    } finally {
      if (id === requestId.current) busy.current = false;
    }
  };

  // Cancel a slow request: the UI is released immediately and a late response is ignored (see `unlock`).
  const cancelUnlock = () => {
    requestId.current += 1;
    busy.current = false;
    setStatus('idle');
    setFocusPin((n) => n + 1);
  };

  const closeVault = () => {
    close();
    setEntry(null);
    setError('');
    setTab('conditions');
    setFocusPin((n) => n + 1); // focus returns to the first PIN box
  };

  // ---- add-record dialog -------------------------------------------------------------------------
  const onSaved = useCallback(
    (saved: SavedRecord) => {
      addRecord(saved.kind, saved.record as never);
      const name = fullName(vault?.patient);
      toast.show({ tone: 'success', title: `${NOUN[saved.kind]} added`, message: `Saved to ${name}’s vault.` });
      setTab(TAB_FOR[saved.kind]);
      requestAnimationFrame(() => {
        document.getElementById(`vault-panel-${TAB_FOR[saved.kind]}`)?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotionNow() ? 'auto' : 'smooth' });
      });
    },
    [addRecord, toast, vault?.patient],
  );

  const signInAgain = async () => {
    await signOut();
    router.replace(clinicianSignInHref('/doctor'));
  };

  const patientId = vault?.patient?.id;

  return (
    <>
      {vault ? (
        <VaultView
          vault={vault}
          recentIds={recentIds}
          canLab={canLab}
          tab={tab}
          onTabChange={setTab}
          onAdd={(kind) => setEntry({ kind, key: Date.now() })}
          onClose={closeVault}
          busy={false}
        />
      ) : (
        <LockedView
          doctorName={user?.fullName || 'Doctor'}
          specialty={user?.specialty}
          doctorRole={user?.doctorRole}
          digits={digits}
          onDigitsChange={setDigits}
          onEdit={() => {
            setError('');
            setExpiredNotice(false);
          }}
          onUnlock={unlock}
          onCancel={cancelUnlock}
          status={status}
          slow={slow}
          error={error}
          expiredNotice={expiredNotice}
          focusRequest={focusPin}
        />
      )}

      {entry && vault && patientId ? (
        <AddRecordDialog
          key={entry.key}
          kind={entry.kind}
          patientId={patientId}
          patientName={fullName(vault.patient)}
          onClosed={() => setEntry(null)}
          onSaved={onSaved}
          onSignInAgain={signInAgain}
        />
      ) : null}

      <Dialog
        visible={expired}
        role="alertdialog"
        size="sm"
        icon="time-outline"
        title="Vault access has expired"
        description="Ask the patient for a new PIN to open their vault again."
        initialFocus="#expired-ok"
        hideClose
        onRequestClose={() => {
          acknowledgeExpiry();
          setFocusPin((n) => n + 1);
        }}
        footer={
          <Button
            id="expired-ok"
            label="OK"
            portal
            size="compact"
            onPress={() => {
              acknowledgeExpiry();
              setFocusPin((n) => n + 1);
            }}
          />
        }
      />
    </>
  );
}
