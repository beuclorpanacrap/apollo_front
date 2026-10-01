import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'expo-router';
import { AppMark } from './app-mark';
import { ClinicianIcon as Icon } from './clinician-icon';
import { useAuth } from '@/context/auth-context';
import { useThemeContext, type ThemeMode } from '@/context/theme-context';
import { ClinicianColors, Fonts } from '@/constants/theme';
import { apiClient, ApiError } from '@/api/client';
import { clearActiveVault } from '@/api/doctor.api';
import { components } from '@/api/types';

const roles = { GENERAL_PRACTITIONER: 'General Practitioner', SPECIALIST: 'Specialist', LAB_TECHNICIAN: 'Lab Technician', PHARMACIST: 'Pharmacist' };
type DoctorRole = keyof typeof roles;
export function DoctorProfile() {
  const { user, logout, updateUserLocally } = useAuth();
  const { theme: t, isDark, themeMode, setThemeMode } = useThemeContext();
  const router = useRouter();
  const [specialty, setSpecialty] = useState(user?.specialty || '');
  const [role, setRole] = useState<DoctorRole | ''>(user?.doctorRole || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  useEffect(() => {
    if (!user?.userId) return;
    try { const saved = localStorage.getItem(`apollo_doctor_specialty_${user.userId}`); if (saved !== null) setSpecialty(saved); } catch { /* Browser storage may be unavailable. */ }
  }, [user?.userId]);
  useEffect(() => { setRole(user?.doctorRole || ''); }, [user?.doctorRole]);
  const saveSpecialty = () => {
    setError(''); setMessage('');
    if (!user?.userId) { setError('Your account identity is unavailable. Please sign in again.'); return; }
    try {
      localStorage.setItem(`apollo_doctor_specialty_${user.userId}`, specialty.trim());
      updateUserLocally({ specialty: specialty.trim() });
      setMessage('Specialty preference saved in this browser.');
    } catch { setError('Browser storage is unavailable. Your specialty preference was not saved.'); }
  };
  const saveRole = async () => {
    if (!role || !user?.profileId || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await apiClient<components['schemas']['DoctorRoleUpdateResponse']>(`/api/v1/admin/doctors/${encodeURIComponent(user.profileId)}/role`, { method: 'PATCH', body: { doctorRole: role } });
      updateUserLocally({ doctorRole: result.doctorRole || role });
      clearActiveVault();
      setMessage('Role updated. Unlock a patient vault again to continue with your new permissions.');
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? 'Your account does not have permission to change this role.' : 'The role could not be updated. Please try again.');
    } finally { setBusy(false); }
  };
  const signOut = async () => { clearActiveVault(); await logout(); router.replace('/welcome'); };
  const style = { '--page': isDark ? t.background : ClinicianColors.background, '--card': t.backgroundElement, '--text': t.text, '--muted': t.textSecondary, '--line': t.border, '--green': t.tintStrong, '--pale': t.pillGreenBg, '--on-green': t.onTint, '--danger': t.danger, fontFamily: Fonts.sans.regular } as CSSProperties;
  return <div className="doctor-profile" style={style}><style>{css}</style>
    <header className="dp-header"><div className="dp-brand"><AppMark size={34} /><strong>Apollo</strong><span>/ Clinicians</span></div><button className="dp-plain" aria-label="Toggle color theme" onClick={() => setThemeMode(isDark ? 'Light' : 'Dark')}><Icon name={isDark ? 'sunny-outline' : 'moon-outline'} /></button></header>
    <main className="dp-main"><button className="dp-plain dp-back" onClick={() => router.replace('/doctor')}><Icon name="arrow-back-outline" />Back to dashboard</button><div className="dp-eyebrow">CLINICIAN ACCOUNT</div><h1>Profile & preferences</h1><p className="dp-subtitle">Manage your professional details and workspace appearance.</p>
      <div className="dp-grid"><div><section className="dp-card"><h2><Icon name="person-outline" />Account & profile</h2>{[['Full name', user?.fullName], ['Email address', user?.email], ['License number', user?.licenseNumber]].map(([label, value]) => <div className="dp-row" key={label}><span>{label}</span><strong>{value || 'Not provided'}</strong></div>)}<p className="dp-help">Account identity and license details are read-only. Profile editing is not currently available.</p></section>
      <section className="dp-card"><h2><Icon name="medkit-outline" />Professional details</h2><form onSubmit={e => { e.preventDefault(); saveSpecialty(); }}><label htmlFor="doctor-specialty">Specialty</label><input id="doctor-specialty" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. General medicine" maxLength={160} /><p className="dp-help">Saved in this browser only. This preference does not update your registered specialty.</p><button className="dp-primary" disabled={!user?.userId}>Save specialty preference</button></form><hr /><form onSubmit={e => { e.preventDefault(); void saveRole(); }}><label htmlFor="doctor-role">Clinical role</label><select id="doctor-role" value={role} disabled={busy} onChange={e => setRole(e.target.value as DoctorRole)}><option value="" disabled>Select a role</option>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="dp-help">Role switching is available through Apollo’s demo permissions service. It changes which clinical actions your account can perform.</p><button className="dp-primary" disabled={busy || !user?.profileId || !role || role === user?.doctorRole}>{busy ? 'Updating…' : 'Update clinical role'}</button></form></section><div aria-live="polite">{message && <div className="dp-message">{message}</div>}{error && <div className="dp-error" role="alert">{error}</div>}</div></div>
      <aside><section className="dp-card"><h2><Icon name="color-palette-outline" />Appearance</h2><p className="dp-help">Choose how Apollo looks in your workspace.</p><div className="dp-themes">{(['System', 'Light', 'Dark'] as ThemeMode[]).map(mode => <button key={mode} aria-pressed={themeMode === mode} className={themeMode === mode ? 'dp-primary' : 'dp-secondary'} onClick={() => setThemeMode(mode)}>{mode}</button>)}</div></section><section className="dp-card"><h2><Icon name="shield-checkmark-outline" />Clinical permissions</h2><p className="dp-help">Patient records require a patient-generated PIN. Existing records remain read-only.</p><p className="dp-help">Lab result entry is available to General Practitioners, Specialists, and Lab Technicians. Pharmacists cannot add lab results.</p></section><section className="dp-card"><h2><Icon name="log-out-outline" />Session</h2><p className="dp-help">Sign out of this browser when you finish using Apollo.</p>{confirmLogout ? <><p>Sign out of your clinician account?</p><div className="dp-themes"><button className="dp-secondary" onClick={() => setConfirmLogout(false)}>Cancel</button><button className="dp-primary" onClick={signOut}>Sign out</button></div></> : <button className="dp-secondary" onClick={() => setConfirmLogout(true)}>Sign out</button>}</section></aside></div>
    </main></div>;
}
const css = `
.doctor-profile{height:100%;overflow:auto;background:var(--page);color:var(--text);font-size:14px;min-width:800px}.doctor-profile *{box-sizing:border-box}.doctor-profile button,.doctor-profile input,.doctor-profile select{font:inherit}.doctor-profile button{cursor:pointer}.doctor-profile button:disabled{opacity:.5;cursor:default}.doctor-profile button:focus-visible,.doctor-profile input:focus-visible,.doctor-profile select:focus-visible{outline:3px solid var(--green);outline-offset:3px}.dp-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;height:86px;padding:0 48px;background:var(--card);border-bottom:1px solid var(--line)}.dp-brand{display:flex;align-items:center;gap:14px}.dp-brand strong{font-size:24px}.dp-brand>span{color:var(--muted)}.dp-plain{display:inline-flex;align-items:center;gap:9px;border:0;background:transparent;color:var(--muted);padding:10px}.dp-main{max-width:1160px;padding:32px 48px 60px;margin:auto}.dp-back{padding-left:0;margin-bottom:22px}.dp-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:700;color:var(--green)}.doctor-profile h1{font-size:30px;letter-spacing:-.8px;margin:10px 0}.doctor-profile p{line-height:1.75}.dp-subtitle{color:var(--muted);margin-bottom:30px}.dp-grid{display:grid;grid-template-columns:1.65fr 1fr;gap:24px}.dp-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;margin-bottom:22px}.dp-card h2{font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;margin:0 0 22px}.dp-card h2>span{color:var(--green)}.dp-row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding:16px 0}.dp-row>span{color:var(--muted);font-size:12px}.dp-row>strong{font-size:13px;font-weight:500;overflow-wrap:anywhere}.dp-card label{display:block;font-size:12px;font-weight:600;margin-bottom:9px}.dp-card input,.dp-card select{width:100%;padding:12px;border:1px solid var(--line);background:var(--page);color:var(--text);border-radius:9px}.dp-help{color:var(--muted);font-size:12px;margin:12px 0 18px}.dp-primary,.dp-secondary{border-radius:9px;padding:11px 15px;font-weight:600!important;border:1px solid var(--green)}.dp-primary{background:var(--green);color:var(--on-green)}.dp-secondary{background:var(--card);color:var(--green)}.dp-card hr{border:0;border-top:1px solid var(--line);margin:28px 0}.dp-themes{display:flex;gap:8px;margin-top:18px}.dp-message{background:var(--pale);color:var(--green);padding:16px;border-radius:10px}.dp-error{color:var(--danger);padding:16px;border:1px solid var(--danger);border-radius:10px}
`;
