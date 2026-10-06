import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ClinicianIcon as Icon } from './clinician-icon';
import type { ClinicianIconName as IconName } from './clinician-icon';
import { Redirect, useRouter } from 'expo-router';
import { AppMark } from './app-mark';
import { useAuth } from '@/context/auth-context';
import { useThemeContext } from '@/context/theme-context';
import { ClinicianColors, Fonts } from '@/constants/theme';
import { activeVault, clearActiveVault, doctorApi, type UnlockedVault } from '@/api/doctor.api';
import { ApiError, apiClient } from '@/api/client';

const roles = { GENERAL_PRACTITIONER: 'General Practitioner', SPECIALIST: 'Specialist', LAB_TECHNICIAN: 'Lab Technician', PHARMACIST: 'Pharmacist' };

export function DoctorDashboard({ vaultView = false }: { vaultView?: boolean }) {
  const { user, logout, updateUserLocally } = useAuth();
  const { theme: t, isDark, setThemeMode } = useThemeContext();
  const router = useRouter();
  useEffect(() => {
    if (!user?.userId) return;
    try {
      const saved = localStorage.getItem(`apollo_doctor_specialty_${user.userId}`);
      if (saved !== null && saved !== user.specialty) updateUserLocally({ specialty: saved });
    } catch { /* Browser preferences are optional. */ }
  }, [user?.userId, user?.specialty, updateUserLocally]);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [status, setStatus] = useState<'idle' | 'validating' | 'success'>('idle');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<number | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const [vault, setVault] = useState<UnlockedVault | null>(() => {
    if (activeVault?.sessionExpiresAt && Date.parse(activeVault.sessionExpiresAt) <= Date.now()) return null;
    return activeVault;
  });
  const vaultSection = useRef<HTMLElement | null>(null);
  const closeVault = () => {
    clearActiveVault(); setVault(null); setEntry(null); setStatus('idle'); setError('');
  };
  const canLab = !!user?.doctorRole && ['GENERAL_PRACTITIONER', 'SPECIALIST', 'LAB_TECHNICIAN'].includes(user.doctorRole);
  const [entry, setEntry] = useState<'encounter' | 'prescription' | 'lab' | null>(null);
  const [saving, setSaving] = useState(false);
  const [, refresh] = useState(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);

  const expired = !!vault?.sessionExpiresAt && Date.parse(vault.sessionExpiresAt) <= Date.now();
  useEffect(() => {
    if (!vault?.sessionExpiresAt) return;
    const timeout = setTimeout(() => { clearActiveVault(); setVault(null); setEntry(null); setStatus('idle'); setError('Vault access has expired. Ask the patient for a new PIN.'); }, Math.max(0, Date.parse(vault.sessionExpiresAt) - Date.now()));
    return () => clearTimeout(timeout);
  }, [vault?.sessionExpiresAt, router]);
  if (vaultView) return <Redirect href="/doctor" />;
  const style = { '--overlay': ClinicianColors.overlay, '--page': isDark ? t.background : ClinicianColors.background, '--card': t.backgroundElement, '--text': t.text, '--muted': t.textSecondary, '--line': t.border, '--green': t.tintStrong, '--pale': t.pillGreenBg, '--danger': t.danger, '--danger-bg': t.dangerBg, '--on-green': t.onTint, fontFamily: Fonts.sans.regular } as CSSProperties;
  const signOut = async () => { alive.current = false; clearActiveVault(); if (timer.current) clearTimeout(timer.current); await logout(); };
  const unlock = async () => {
    if (busy.current || vault || digits.join('').length !== 6) return;
    busy.current = true; setStatus('validating'); setError('');
    try {
      const unlocked = await doctorApi.unlock(digits.join(''));
      if (!alive.current) { clearActiveVault(); return; }
      setDigits(Array(6).fill('')); setStatus('success');
      setVault(unlocked);
      setEntry(null);
      timer.current = setTimeout(() => {
        setStatus('idle');
        vaultSection.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        vaultSection.current?.focus({ preventScroll: true });
      }, 500);
    } catch (e) {
      if (!alive.current) return;
      setStatus('idle');
      if (e instanceof ApiError && e.status === 401) { await signOut(); return; }
      setError(e instanceof ApiError && e.status === 400 ? 'This PIN is invalid, expired, or already used. Ask the patient to generate a new PIN.' : e instanceof ApiError && e.status === 403 ? 'Your account does not have permission to unlock this vault.' : 'The vault could not be reached. Please try again.');
      setDigits(Array(6).fill('')); refs.current[0]?.focus();
    } finally { busy.current = false; }
  };
  const putDigits = (value: string, index: number) => {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    setError('');
    setDigits(previous => { const next = [...previous]; if (!clean) next[index] = ''; else [...clean].forEach((digit, offset) => { if (index + offset < 6) next[index + offset] = digit; }); return next; });
    if (clean) refs.current[Math.min(index + clean.length, 5)]?.focus();
  };
  const save = async (form: HTMLFormElement) => {
    if (!vault?.patient?.id || saving || !entry) return;
    setSaving(true); setError('');
    const values = Object.fromEntries(new FormData(form));
    try {
      const endpoint = entry === 'lab' ? 'test-results' : entry === 'prescription' ? 'prescriptions' : 'encounters';
      const body = { ...values, patientId: vault.patient.id, ...(entry === 'lab' ? { numericValue: Number(values.numericValue), recordedAt: new Date(String(values.recordedAt)).toISOString() } : {}), ...(entry === 'prescription' ? { expiresAt: new Date(String(values.expiresAt)).toISOString() } : {}) };
      const result = await apiClient<any>(`/api/v1/doctor/${endpoint}`, { method: 'POST', body });
      if (entry === 'lab') vault.testResults = [...(vault.testResults ?? []), result];
      else if (entry === 'prescription') vault.prescriptions = [...(vault.prescriptions ?? []), result];
      else vault.encounterHistory = [...(vault.encounterHistory ?? []), result];
      setEntry(null); refresh(x => x + 1);
    } catch (e) {
      if (e instanceof ApiError) {
        const fallback = e.status === 401
          ? 'Your sign-in session has expired. Please sign in again.'
          : e.status === 403
            ? 'The server denied this action. Check your clinical role and unlock the patient vault again.'
            : e.status === 400
              ? 'The server rejected the entry. Check the required fields and encounter date.'
              : e.status === 404
                ? 'The patient or doctor profile could not be found.'
                : 'The entry could not be saved. Please try again.';
        const detail = e.message && !e.message.startsWith('Request failed with status') ? e.message : fallback;
        setError(`${detail} (HTTP ${e.status})`);
      } else {
        setError('The server could not be reached or the entry could not be prepared. Please try again.');
      }
    }
    finally { setSaving(false); }
  };
  const field = (name: string, label: string, type = 'text') => <label className="entry-label">{label}<input name={name} type={type} required step={type === 'number' ? 'any' : undefined} /></label>;
  return <div className="clinician" style={style}>
    <style>{css}</style>
    <header className="topbar"><div className="brand"><AppMark size={34} /><span>Apollo</span><span className="brand-sub">/ Clinicians</span></div><div className="header-actions"><button className="icon-button" aria-label="Toggle color theme" onClick={() => setThemeMode(isDark ? 'Light' : 'Dark')}><Icon name={isDark ? 'sunny-outline' : 'moon-outline'} /></button><span className="divider" /><button className="text-button" disabled={status !== 'idle'} onClick={() => router.push('./doctor-profile')}><Icon name="person-circle-outline" />Profile</button></div></header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow">CLINICAL WORKSPACE</div><h1>{vaultView ? 'Patient vault' : `Welcome, ${user?.fullName || 'Doctor'}`}</h1><p>{vaultView ? 'Review the patient’s records and document this consultation.' : 'Patient-authorized access. Everything you need for the next consultation.'}</p></div><span className="badge"><Icon name="shield-checkmark-outline" size={16} />{vault ? 'Vault unlocked' : 'Clinician portal'}</span></div>
      <>
        <div className="dashboard-grid"><section className="card unlock-card"><div className="section-label"><span className="icon-tile"><Icon name="lock-open-outline" size={25} /></span><span>PATIENT ACCESS</span><span className="badge small">6-digit PIN</span></div><h2>Unlock a patient vault</h2><p className="intro">Ask your patient for the access PIN generated in their Apollo app.<br />Enter it below to open their health record.</p>
          <form onSubmit={e => { e.preventDefault(); void unlock(); }}><label className="pin-label" htmlFor="pin-0">Patient access PIN</label><div className="pin-row">{digits.map((digit, i) => <input key={i} id={`pin-${i}`} ref={el => { refs.current[i] = el; }} className={`pin-box ${focused === i ? 'focused' : ''} ${error ? 'invalid' : ''}`} aria-label={`PIN digit ${i + 1}`} aria-invalid={!!error} aria-describedby="pin-help pin-status" type="text" inputMode="numeric" autoComplete="off" value={digit} disabled={status !== 'idle' || !!vault} onFocus={e => { setFocused(i); e.target.select(); }} onBlur={() => setFocused(null)} onChange={e => putDigits(e.target.value, i)} onPaste={e => { e.preventDefault(); putDigits(e.clipboardData.getData('text'), 0); }} onKeyDown={e => { if (e.key === 'Backspace' && !digits[i] && i > 0) { e.preventDefault(); setDigits(prev => prev.map((d, j) => j === i - 1 ? '' : d)); refs.current[i - 1]?.focus(); } if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus(); } if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); refs.current[i + 1]?.focus(); } }} />)}</div><p id="pin-help" className="helper"><Icon name="time-outline" size={15} />PINs are single-use and expire after 15 minutes.</p><div id="pin-status" aria-live="polite">{error && !entry && <p className="error" role="alert">{error}</p>}{vault && status === 'idle' && <p className="success">Patient vault open below. Close it before entering another PIN.</p>}{status === 'success' && <p className="success"><Icon name="checkmark-circle-outline" />Vault unlocked. The patient record is available below.</p>}</div><button className="primary unlock-button" disabled={digits.join('').length !== 6 || status !== 'idle' || !!vault} type="submit"><Icon name={status === 'success' ? 'checkmark-circle-outline' : status === 'validating' ? 'hourglass-outline' : 'lock-open-outline'} />{status === 'validating' ? 'Validating PIN…' : status === 'success' ? 'Vault unlocked' : 'Unlock patient vault'}{status === 'idle' && <Icon name="arrow-forward-outline" size={18} />}</button></form><div className="privacy-note"><Icon name="shield-checkmark-outline" size={18} /><span>Records are only accessible with the patient’s authorization.</span></div>
        </section><aside className="side-column"><section className="card profile-card"><div className="eyebrow">YOUR CLINICIAN PROFILE</div><div className="profile-top"><div className="avatar">{(user?.fullName || 'Doctor').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}</div><div><h3>{user?.fullName || 'Doctor'}</h3><p>{user?.specialty || 'Clinician'}</p></div></div><dl>{user?.doctorRole && <><dt>Role</dt><dd>{roles[user.doctorRole]}</dd></>}<dt>Email</dt><dd>{user?.email || 'Not provided'}</dd>{user?.licenseNumber && <><dt>License number</dt><dd>{user.licenseNumber}</dd></>}</dl></section><section className="card access-note"><Icon name="people-outline" size={24} /><h3>Access starts with the patient</h3><p>Ask the patient to open <strong>Consultation</strong> in Apollo and generate a PIN. A new PIN is needed for each vault unlock.</p></section></aside></div>
        <section className="workflow"><div className="workflow-heading"><h3>From PIN to consultation</h3><span>A simple, patient-led workflow</span></div><div className="steps">{[{ icon: 'key-outline', title: '01  ·  Receive a PIN', text: 'The patient generates a temporary access PIN in Apollo.' }, { icon: 'reader-outline', title: '02  ·  Review the record', text: 'View demographics, conditions, encounters, prescriptions, and test results.' }, { icon: 'create-outline', title: '03  ·  Document care', text: `Add an encounter or prescription.${canLab ? ' Record lab results when needed.' : ''} Existing records remain read-only.` }].map(step => <div className="step" key={step.title}><Icon name={step.icon as IconName} size={23} /><div><h4>{step.title}</h4><p>{step.text}</p></div></div>)}</div></section>{!vault && <footer><Icon name="lock-closed-outline" size={14} />No patient record is open. Enter a patient PIN to begin.</footer>}
      </>{vault && !expired && <section className="inline-vault" ref={vaultSection} tabIndex={-1} aria-label="Unlocked patient vault"><div className="workflow-heading"><h2>Patient vault</h2><button className="text-button" disabled={saving} onClick={closeVault}><Icon name="close-circle-outline" />Close patient vault</button></div><section className="card"><h2>{[vault.patient?.firstName, vault.patient?.lastName].filter(Boolean).join(' ') || 'Patient record'}</h2><div className="demographics">{[['Date of birth', vault.patient?.dateOfBirth], ['Gender', vault.patient?.gender], ['Blood type', vault.patient?.bloodType], ['Height', vault.patient?.heightCm != null ? `${vault.patient.heightCm} cm` : undefined], ['Weight', vault.patient?.weightKg != null ? `${vault.patient.weightKg} kg` : undefined]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 'Not recorded'}</strong></div>)}</div>{vault.sessionExpiresAt && <p className="helper">Access expires: {new Date(vault.sessionExpiresAt).toLocaleString()}</p>}<div className="vault-actions"><button className="primary" disabled={!vault.patient?.id} onClick={() => { setError(''); setEntry('encounter'); }}>Add encounter</button><button className="secondary" disabled={!vault.patient?.id} onClick={() => { setError(''); setEntry('prescription'); }}>Add prescription</button>{canLab && <button className="secondary" disabled={!vault.patient?.id} onClick={() => router.push('/doctor-lab-result')}>Add lab result</button>}</div></section><div className="record-grid">{[{ title: 'Conditions & allergies', rows: (vault.allConditions ?? [...(vault.allergies ?? []), ...(vault.chronicConditions ?? [])]).map(x => [x.title, x.type, x.notes]) }, { title: 'Encounter history', rows: (vault.encounterHistory ?? []).map(x => [x.diagnosis, x.encounterDate, x.clinicalNotes]) }, { title: 'Prescriptions', rows: (vault.prescriptions ?? []).map(x => [x.medicationName, x.status, [x.dosage, x.instructions].filter(Boolean).join(' · ')]) }, { title: 'Test results', rows: (vault.testResults ?? []).map(x => [x.testName, x.recordedAt ? new Date(x.recordedAt).toLocaleDateString() : '', `${x.numericValue ?? '—'} ${x.unit || ''}`]) }].map(section => <section className="card" key={section.title}><h3>{section.title}</h3>{section.rows.length ? section.rows.map((row, i) => <div className="record-row" key={i}><strong>{row[0] || 'Untitled record'}</strong><span>{row[1]}</span><p>{row[2]}</p></div>) : <p>No records available.</p>}</section>)}</div></section>}
    </main>
    {entry && <div className="modal-backdrop"><section className="card entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-title"><h2 id="entry-title">Add {entry === 'lab' ? 'lab result' : entry}</h2><p>This adds a new record to the patient’s vault.</p><form onSubmit={e => { e.preventDefault(); void save(e.currentTarget); }}>{entry === 'encounter' ? <>{field('diagnosis', 'Diagnosis')}{field('clinicalNotes', 'Clinical notes')}{field('encounterDate', 'Encounter date', 'date')}</> : entry === 'prescription' ? <>{field('medicationName', 'Medication and strength')}{field('dosage', 'Dosage')}{field('instructions', 'Instructions')}{field('expiresAt', 'Valid until', 'datetime-local')}</> : <>{field('testName', 'Test name')}{field('numericValue', 'Result', 'number')}{field('unit', 'Unit')}{field('recordedAt', 'Recorded at', 'datetime-local')}</>}{error && <p role="alert" className="error">{error}</p>}<div className="vault-actions"><button type="button" className="secondary" disabled={saving} onClick={() => setEntry(null)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button></div></form></section></div>}
  </div>;
}

const css = `
.clinician{height:100%;min-height:0;overflow:auto;background:var(--page);color:var(--text);font-size:14px}.clinician *{box-sizing:border-box}.clinician button,.clinician input{font:inherit}.clinician button{cursor:pointer}.clinician button:disabled{cursor:default;opacity:.5}.clinician button:focus-visible,.clinician input:focus-visible{outline:3px solid var(--green);outline-offset:4px}.topbar{position:sticky;top:0;z-index:2;height:86px;padding:0 48px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.brand,.header-actions{display:flex;align-items:center;gap:14px}.brand>span{font-size:24px;font-weight:700;letter-spacing:-1px}.brand .brand-sub{font-size:15px;color:var(--muted);font-weight:400;letter-spacing:0;margin-left:8px}.icon-button,.text-button{border:0;background:transparent;color:var(--muted);display:inline-flex;align-items:center;gap:9px;padding:10px}.icon-button{border:1px solid var(--line);border-radius:10px;color:var(--text)}.divider{height:24px;width:1px;background:var(--line)}.workspace{max-width:1280px;padding:48px 48px 24px;margin:auto}.page-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:34px;gap:24px}.eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:700;color:var(--green)}.clinician h1{font-size:30px;letter-spacing:-.8px;line-height:1.3;margin:10px 0}.clinician h2{font-size:26px;letter-spacing:-.7px;font-weight:600;margin:25px 0 12px}.clinician h3{font-size:16px;font-weight:600;margin:0 0 10px}.clinician p{color:var(--muted);line-height:1.75;margin:0}.badge{display:inline-flex;align-items:center;gap:7px;background:var(--pale);color:var(--green);border-radius:30px;padding:9px 13px;font-size:12px;white-space:nowrap}.dashboard-grid{display:grid;grid-template-columns:minmax(530px,1.8fr) minmax(300px,1fr);gap:24px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px}.unlock-card{padding:34px 38px}.section-label{display:flex;align-items:center;gap:12px;color:var(--green);font-size:10px;font-weight:700;letter-spacing:1.5px}.icon-tile{display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;background:var(--pale)}.small{margin-left:auto;letter-spacing:0;font-weight:500;font-size:11px}.intro{font-size:14px}.pin-label{display:block;margin:28px 0 12px;font-weight:600;font-size:12px}.pin-row{display:flex;gap:12px}.pin-box{width:60px;height:66px;border-radius:12px;border:1px solid var(--line);background:var(--page);color:var(--text);text-align:center;font-size:26px!important;font-weight:600;caret-color:var(--green)}.pin-box.focused{border:2px solid var(--green);background:var(--card)}.pin-box.invalid{border-color:var(--danger)}.helper{display:flex;gap:7px;align-items:center;font-size:11px;margin-top:14px!important}.primary,.secondary{display:inline-flex;justify-content:center;align-items:center;gap:10px;border-radius:10px;padding:13px 18px;font-weight:600!important;border:1px solid var(--green)}.primary{background:var(--green);color:var(--on-green)}.secondary{background:var(--card);color:var(--green)}.unlock-button{width:100%;margin-top:24px;height:48px}.unlock-button>div:last-child{margin-left:auto}.privacy-note{display:flex;align-items:center;gap:9px;border-top:1px solid var(--line);padding-top:19px;margin-top:24px;color:var(--muted);font-size:11px}.side-column{display:flex;flex-direction:column;gap:20px}.profile-top{display:flex;align-items:center;gap:13px;margin:24px 0}.avatar{width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:var(--pale);color:var(--green);border-radius:50%;font-weight:600}.profile-top h3{margin:0 0 4px}.profile-top p{font-size:12px}.profile-card dl{border-top:1px solid var(--line);padding-top:16px;margin:0}.profile-card dt{color:var(--muted);font-size:11px;margin-bottom:5px}.profile-card dd{margin:0 0 15px;font-size:12px;overflow-wrap:anywhere}.profile-card dd:last-child{margin:0}.access-note{background:var(--pale);border-color:transparent;color:var(--green);padding:24px 28px}.access-note h3{margin-top:13px;font-size:14px}.access-note p{font-size:12px}.workflow{margin-top:36px}.workflow-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.workflow-heading h3{margin:0;font-size:14px}.workflow-heading>span{font-size:11px;color:var(--muted)}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.step{display:flex;gap:14px;padding:8px 0;color:var(--green)}.step h4{font-size:12px;font-weight:600;color:var(--text);margin:0 0 7px}.step p{font-size:12px}.clinician footer{display:flex;justify-content:center;align-items:center;gap:8px;color:var(--muted);font-size:11px;border-top:1px solid var(--line);margin-top:34px;padding-top:22px}.error{background:var(--danger-bg);color:var(--danger)!important;padding:12px;border-radius:8px;margin-top:14px!important;font-size:12px}.success{color:var(--green)!important;display:flex;align-items:center;gap:8px;margin-top:16px!important}.back{padding-left:0;margin-bottom:18px}.demographics{display:flex;gap:40px;flex-wrap:wrap;margin:22px 0}.demographics span,.demographics strong{display:block}.demographics span{font-size:12px;color:var(--muted);margin-bottom:7px}.vault-actions{display:flex;gap:12px;margin-top:24px}.inline-vault{margin-top:34px;padding-top:24px;border-top:1px solid var(--line);scroll-margin-top:106px}.inline-vault:focus{outline:none}.record-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}.record-row{border-top:1px solid var(--line);padding:16px 0}.record-row span{float:right;font-size:11px;color:var(--muted)}.record-row p{margin-top:8px;font-size:13px;white-space:pre-wrap}.modal-backdrop{position:fixed;inset:0;background:var(--overlay);display:flex;align-items:center;justify-content:center;z-index:10}.entry-dialog{width:500px;max-height:90vh;overflow:auto}.entry-dialog h2{margin-top:0}.entry-label{display:block;font-size:12px;margin-top:18px}.entry-label input{display:block;width:100%;margin-top:8px;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--page);color:var(--text)}@media(max-width:1000px){.workspace{padding:32px}.topbar{padding:0 32px}.dashboard-grid{grid-template-columns:minmax(460px,1.5fr) minmax(260px,1fr);gap:18px}.unlock-card{padding:28px}.pin-row{gap:8px}.pin-box{width:55px}.card{padding:26px}}@media(max-width:800px){.clinician{min-width:800px}}
`;





