import { useId, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Layout } from '@/constants/theme';
import { useClinicianVault } from '@/context/clinician-vault-context';
import { useTheme } from '@/hooks/use-theme';
import { fullName } from '@/utils/clinician-format';

/** The rail stays reachable at the left edge; mouse, keyboard and touch can open it. */
export function PatientMenu({ disabled }: { disabled: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { vault, vaults, select } = useClinicianVault();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const choose = (next: typeof vault) => {
    if (disabled) return;
    select(next);
    setOpen(false);
    trigger.current?.blur();
    router.push('/doctor');
  };
  return (
    <nav
      className="ap-patient-menu"
      aria-label="Patient vaults"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!document.activeElement?.matches(':focus-visible') || !document.activeElement.closest('.ap-patient-menu')) setOpen(false); }}
      onFocus={event => { if (event.target.matches(':focus-visible')) setOpen(true); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}
      style={{ position: 'fixed', left: 0, top: Layout.headerHeight + 20, zIndex: 25, fontFamily: Fonts.sans.regular, color: theme.text }}
    >
      <button
        ref={trigger}
        type="button"
        className="ap-focus"
        aria-label={`Patients, ${vaults.length} unlocked vaults`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(previous => !previous)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, border: `1px solid ${theme.border}`, borderRadius: '0 12px 12px 0', background: theme.pillGreenBg, color: theme.accentText, cursor: 'pointer' }}
      >
        <Ionicons name="people-outline" size={22} color={theme.accentText} />
        <span>{vaults.length}</span>
      </button>
      {open && (
        <div id={id} style={{ boxSizing: 'border-box', width: 'min(300px, calc(100vw - 16px))', maxHeight: '70vh', overflowY: 'auto', padding: 16, background: theme.backgroundElement, border: `1px solid ${theme.border}`, borderRadius: '0 12px 12px 0' }}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Patient vaults</h2>
          {vaults.length ? vaults.map((patient, index) => (
            <button
              key={patient.patient?.id ?? index}
              type="button"
              className="ap-focus"
              disabled={disabled}
              aria-current={patient === vault ? 'true' : undefined}
              onClick={() => choose(patient)}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', padding: 12, marginBottom: 8, border: `1px solid ${patient === vault ? theme.tintStrong : theme.border}`, borderRadius: 12, background: patient === vault ? theme.pillGreenBg : theme.background, color: theme.text, textAlign: 'left', cursor: disabled ? 'default' : 'pointer' }}
            >
              <strong>{fullName(patient.patient)}</strong>
              <small>Access until {new Date(patient.sessionExpiresAt!).toLocaleString()}</small>
            </button>
          )) : <p style={{ fontSize: 13, color: theme.textSecondary }}>Unlock a patient with their PIN to add them here.</p>}
          <button type="button" className="ap-focus" disabled={disabled} onClick={() => choose(null)} style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${theme.tintStrong}`, background: theme.tintStrong, color: theme.onTint, cursor: disabled ? 'default' : 'pointer' }}>Unlock another patient</button>
        </div>
      )}
    </nav>
  );
}
