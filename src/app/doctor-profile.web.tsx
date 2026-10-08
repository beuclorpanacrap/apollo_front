import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ApiError, apiClient } from '@/api/client';
import type { components } from '@/api/types';
import { PolicyDialog } from '@/components/portal/policy-dialog';
import { PortalHero } from '@/components/portal/portal-hero';
import { PortalLoading } from '@/components/portal/portal-loading';
import { PortalShell, usePortalActions } from '@/components/portal/portal-shell';
import { useSessionCountdown } from '@/components/portal/session-timer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { SelectField, TextField } from '@/components/ui/form-field';
import { InlineAlert } from '@/components/ui/inline-alert';
import { pressState, useInteractive } from '@/components/ui/interactive';
import { useToast } from '@/components/ui/toast';
import { BrandColors, Fonts, Layout, Radii, Space } from '@/constants/theme';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, type PolicyContent } from '@/content/legal';
import { useAuth } from '@/context/auth-context';
import { useClinicianVault } from '@/context/clinician-vault-context';
import { useThemeContext, type ThemeMode } from '@/context/theme-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';
import {
  DOCTOR_ROLE_CAPABILITIES,
  DOCTOR_ROLE_LABELS,
  fullName,
  isDoctorRole,
  type DoctorRole,
} from '@/utils/clinician-format';
import { clinicianSignInHref } from '@/utils/portal-routes';
import { webProps } from '@/utils/web-props';

export { PortalErrorBoundary as ErrorBoundary } from '@/components/portal/route-error';

// Route entry (web). Native builds use ./doctor-profile.tsx, which shows the web-only notice.
const TITLE = 'Profile · Apollo Clinicians';

export default function DoctorProfileScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PortalLoading title={TITLE} active="profile" />;
  if (!isAuthenticated) return <Redirect href={clinicianSignInHref('/doctor-profile')} />;
  if (user?.role !== 'ROLE_DOCTOR') return <Redirect href="/(tabs)" />;
  return (
    <PortalShell active="profile" title={TITLE}>
      <DoctorProfile />
    </PortalShell>
  );
}

const ROLE_OPTIONS = (Object.entries(DOCTOR_ROLE_LABELS) as [DoctorRole, string][]).map(([value, label]) => ({ value, label }));
const SPECIALTY_MAX = 160;

function DoctorProfile() {
  const { user, updateUserLocally } = useAuth();
  const { themeMode, setThemeMode } = useThemeContext();
  const { vault, close } = useClinicianVault();
  const { requestSignOut } = usePortalActions();
  const { width } = useBreakpoint();
  const toast = useToast();
  const theme = useTheme();
  const wide = width >= 900;

  const savedSpecialty = user?.specialty || '';
  const [specialty, setSpecialty] = useState(savedSpecialty);
  const [savedFlash, setSavedFlash] = useState(false);
  const [role, setRole] = useState<DoctorRole | ''>(isDoctorRole(user?.doctorRole) ? user.doctorRole : '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [specialtyError, setSpecialtyError] = useState('');
  const [policy, setPolicy] = useState<PolicyContent | null>(null);

  // Specialty is a per-browser preference (unchanged behavior).
  useEffect(() => {
    if (!user?.userId) return;
    try {
      const saved = localStorage.getItem(`apollo_doctor_specialty_${user.userId}`);
      if (saved !== null) setSpecialty(saved);
    } catch {
      /* Browser storage may be unavailable. */
    }
  }, [user?.userId]);
  useEffect(() => {
    setRole(isDoctorRole(user?.doctorRole) ? user.doctorRole : '');
  }, [user?.doctorRole]);
  useEffect(() => {
    if (!savedFlash) return;
    const id = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(id);
  }, [savedFlash]);

  const specialtyDirty = specialty.trim() !== savedSpecialty.trim();

  const saveSpecialty = () => {
    setError('');
    setMessage('');
    setSpecialtyError('');
    if (!user?.userId) {
      setSpecialtyError('Your account identity is unavailable. Please sign in again.');
      return;
    }
    try {
      localStorage.setItem(`apollo_doctor_specialty_${user.userId}`, specialty.trim());
      updateUserLocally({ specialty: specialty.trim() });
      setSavedFlash(true);
      toast.show({ tone: 'success', message: 'Specialty preference saved in this browser.' });
    } catch {
      setSpecialtyError('Browser storage is unavailable. Your specialty preference was not saved.');
    }
  };

  const currentRole = isDoctorRole(user?.doctorRole) ? user.doctorRole : undefined;
  const roleBlockedReason = !user?.profileId
    ? 'Your account has no profile id, so the role can’t be changed from here.'
    : !role
      ? 'Choose a role to continue.'
      : role === currentRole
        ? 'This is already your clinical role. Choose a different one to update it.'
        : '';

  const saveRole = async () => {
    if (!role || !user?.profileId || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiClient<components['schemas']['DoctorRoleUpdateResponse']>(
        `/api/v1/admin/doctors/${encodeURIComponent(user.profileId)}/role`,
        { method: 'PATCH', body: { doctorRole: role } },
      );
      updateUserLocally({ doctorRole: result.doctorRole || role });
      close(); // role changes permissions: any open vault must be unlocked again
      setMessage('Role updated. Unlock a patient vault again to continue with your new permissions.');
      toast.show({ tone: 'success', title: 'Clinical role updated', message: `You are now a ${(DOCTOR_ROLE_LABELS[role] ?? role).toLowerCase()}.` });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? 'Your account does not have permission to change this role.' : 'The role could not be updated. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.page}>
      <PortalHero size="compact" eyebrow="Clinician account" eyebrowIcon="person-circle-outline" title="Profile & preferences" />

      {/* One compact block: two equal columns whose bottom edges line up (the last card in each stretches). */}
      <View style={[styles.columns, wide ? styles.columnsWide : null]}>
        {/* ------------------------------------------------------------------ left column */}
        <View style={[styles.col, wide ? styles.colWide : null]}>
          <Card variant="portal" style={styles.card}>
            <CardTitle icon="person-outline" title="Account & profile" />
            <View style={styles.detailList}>
              <DetailRow compact icon="person-outline" labelColor={theme.textMuted} label="Full name">
                {user?.fullName || 'Not provided'}
              </DetailRow>
              <DetailRow compact icon="mail-outline" labelColor={theme.textMuted} label="Email address">
                {user?.email || 'Not provided'}
              </DetailRow>
              <DetailRow compact icon="ribbon-outline" labelColor={theme.textMuted} label="License number">
                {user?.licenseNumber || 'Not provided'}
              </DetailRow>
            </View>
            <Text style={[styles.help, { color: theme.textMuted }]}>
              Account identity and license details are read-only. Profile editing is not currently available.
            </Text>
          </Card>

          <Card variant="portal" style={styles.card}>
            <CardTitle icon="color-palette-outline" title="Appearance" subtitle="Choose how Apollo looks in your workspace." />
            <View role="group" aria-label="Color theme" style={styles.themeRow}>
              {(['System', 'Light', 'Dark'] as ThemeMode[]).map((mode) => (
                <View key={mode} style={{ flex: 1 }}>
                  <Button
                    label={mode}
                    icon={mode === 'System' ? 'desktop-outline' : mode === 'Light' ? 'sunny-outline' : 'moon-outline'}
                    portal
                    size="compact"
                    variant={themeMode === mode ? 'primary' : 'secondary'}
                    fullWidth
                    onPress={() => setThemeMode(mode)}
                    {...webProps({ 'aria-pressed': themeMode === mode })}
                  />
                </View>
              ))}
            </View>
          </Card>

          <Card variant="portal" style={[styles.card, wide ? styles.grow : null]}>
            <CardTitle icon="medkit-outline" title="Professional details" />

            <TextField
              label="Specialty"
              help="Saved in this browser only. This preference does not update your registered specialty."
              placeholder="e.g. General medicine"
              value={specialty}
              onChangeText={(value) => {
                setSpecialty(value);
                setSpecialtyError('');
              }}
              maxLength={SPECIALTY_MAX}
              counterFrom={Math.floor(SPECIALTY_MAX * 0.9)}
              optional
              error={specialtyError || null}
              onEnter={saveSpecialty}
            />
            <View style={styles.actionRow}>
              <Button
                label={savedFlash ? 'Saved' : 'Save specialty preference'}
                icon={savedFlash ? 'checkmark' : undefined}
                portal
                size="compact"
                disabled={!user?.userId || (!specialtyDirty && !savedFlash)}
                onPress={saveSpecialty}
              />
              {!specialtyDirty && !savedFlash ? (
                <Text style={[styles.actionHint, { color: theme.textMuted }]}>No changes to save.</Text>
              ) : null}
            </View>

            <View style={[styles.rule, { backgroundColor: theme.border }]} />

            <SelectField
              label="Clinical role"
              help="Role switching is available through Apollo’s demo permissions service. It changes which clinical actions your account can perform."
              value={role}
              onValueChange={(value) => setRole(value as DoctorRole)}
              options={ROLE_OPTIONS}
              placeholderOption="Select a role"
              disabled={busy}
            />
            <View style={styles.actionRow}>
              <Button
                label={busy ? 'Updating…' : 'Update clinical role'}
                portal
                size="compact"
                loading={busy}
                disabled={!!roleBlockedReason}
                onPress={saveRole}
              />
              {roleBlockedReason ? <Text style={[styles.actionHint, { color: theme.textMuted }]}>{roleBlockedReason}</Text> : null}
            </View>

            {message ? <InlineAlert tone="success" onDismiss={() => setMessage('')}>{message}</InlineAlert> : null}
            {error ? <InlineAlert tone="error" onDismiss={() => setError('')}>{error}</InlineAlert> : null}
          </Card>
        </View>

        {/* ------------------------------------------------------------------ right column */}
        <View style={[styles.col, wide ? styles.colWide : null]}>
          <DemoPermissions current={currentRole} />

          <Card variant="portal" style={[styles.card, wide ? styles.grow : null]}>
            <CardTitle icon="document-text-outline" title="Legal & policies" />
            <View style={styles.linkList}>
              {[PRIVACY_POLICY, TERMS_OF_SERVICE].map((doc) => (
                <LinkRow key={doc.title} label={doc.title} description={doc.subtitle} onPress={() => setPolicy(doc)} />
              ))}
            </View>
          </Card>

          <SessionCard
            style={wide ? styles.grow : undefined}
            vaultName={vault ? fullName(vault.patient) : null}
            expiresAt={vault?.sessionExpiresAt}
            onSignOut={requestSignOut}
          />
        </View>
      </View>

      <PolicyDialog content={policy} onClose={() => setPolicy(null)} />
    </View>
  );
}

function CardTitle({
  icon,
  title,
  subtitle,
  aside,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  /** One short line under the title, so a card doesn't need a separate intro paragraph. */
  subtitle?: string;
  aside?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.cardTitle}>
      <View style={[styles.cardIcon, { backgroundColor: theme.pillGreenBg }]}>
        <Ionicons name={icon} size={18} color={theme.accentText} />
      </View>
      <View style={styles.cardTitleCopy}>
        <Text role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.h2, { color: theme.text }]}>
          {title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {aside}
    </View>
  );
}

function LinkRow({ label, description, onPress }: { label: string; description?: string; onPress: () => void }) {
  const theme = useTheme();
  const fx = useInteractive();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, opens a dialog`}
      {...webProps({ 'aria-haspopup': 'dialog' })}
      style={(state) => {
        const s = pressState(state);
        return [
          styles.linkRow,
          { backgroundColor: s.hovered ? theme.surfaceMuted : 'transparent', borderColor: theme.border },
          fx.ring(theme, s),
          fx.transition,
        ];
      }}
    >
      <View style={styles.linkRowCopy}>
        <Text style={[styles.linkRowText, { color: theme.text }]}>{label}</Text>
        {description ? <Text style={[styles.linkRowDescription, { color: theme.textMuted }]}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

/** Demo-only role switching: tinted, labelled, and explicit about what each role can do. */
function DemoPermissions({ current }: { current?: DoctorRole }) {
  const theme = useTheme();
  return (
    <Card variant="portal" style={[styles.card, { borderColor: BrandColors.marigold, borderWidth: 1.5 }]}>
      <View style={styles.cardTitle}>
        <View style={[styles.cardIcon, { backgroundColor: theme.pillMarigoldBg }]}>
          <Ionicons name="warning-outline" size={18} color={theme.pillMarigoldText} />
        </View>
        <Text role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.h2, { color: theme.text, flex: 1 }]}>
          Demo permissions
        </Text>
        <Badge size="md" style={{ alignSelf: 'center' }} label="Demo only" icon="flask-outline" bg={theme.pillMarigoldBg} fg={theme.pillMarigoldText} />
      </View>
      <Text style={[styles.help, { color: theme.textMuted }]}>
        Patient records require a patient-generated PIN. Existing records remain read-only.
      </Text>
      <View role="list" style={{ gap: Space[2] }}>
        {ROLE_OPTIONS.map((option) => {
          const isCurrent = option.value === current;
          return (
            <View
              key={option.value}
              role="listitem"
              style={[styles.roleRow, { backgroundColor: isCurrent ? theme.pillGreenBg : theme.surfaceMuted, borderColor: isCurrent ? theme.tintStrong : 'transparent' }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.roleName, { color: theme.text }]}>{option.label}</Text>
                <Text style={[styles.roleText, { color: theme.textMuted }]}>{DOCTOR_ROLE_CAPABILITIES[option.value]}</Text>
              </View>
              {isCurrent ? <Badge size="md" style={{ alignSelf: 'center' }} label="Your role" icon="checkmark-circle" bg={theme.backgroundElement} fg={theme.pillGreenText} /> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function SessionCard({
  vaultName,
  expiresAt,
  onSignOut,
  style,
}: {
  vaultName: string | null;
  expiresAt?: string;
  onSignOut: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const countdown = useSessionCountdown(expiresAt);
  return (
    <Card variant="portal" style={[styles.card, style]}>
      <CardTitle icon="log-out-outline" title="Session" subtitle="Sign out of this browser when you finish using Apollo." />
      {expiresAt ? (
        <View style={[styles.vaultNote, { backgroundColor: theme.pillGreenBg }]}>
          <Ionicons name="lock-open-outline" size={18} color={theme.accentText} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleName, { color: theme.text }]}>A patient vault is open</Text>
            <Text style={[styles.roleText, { color: theme.textMuted }]}>
              {countdown.expiryText} ({countdown.label} left). Signing out or changing your role closes it.
            </Text>
          </View>
        </View>
      ) : null}
      {/* Sits at the bottom edge when the card is stretched to line up with the other column. */}
      <View style={styles.pushDown}>
        <Button label="Sign out" icon="log-out-outline" variant="danger" portal size="compact" fullWidth onPress={onSignOut} />
        {vaultName ? <Text style={[styles.inlineHint, { color: theme.textMuted }]}>Open vault: {vaultName}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // The whole page is one centered, compact block instead of the full portal width.
  page: { width: '100%', maxWidth: Layout.blockMaxWidth, alignSelf: 'center', gap: Space[4] },
  columns: { gap: Space[4] },
  columnsWide: { flexDirection: 'row', alignItems: 'stretch' },
  col: { minWidth: 0, gap: Space[4] },
  colWide: { flex: 1 },
  grow: { flexGrow: 1 },
  pushDown: { marginTop: 'auto', gap: Space[3] },
  detailList: { gap: Space[4] },
  card: { gap: Space[4] },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: Space[3] },
  cardTitleCopy: { flex: 1, minWidth: 0 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular },
  help: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans.regular },
  inlineHint: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans.regular, flexShrink: 1 },
  actionHint: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans.regular, flex: 1, flexBasis: 0, minWidth: 120 },
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space[3] },
  rule: { height: 1, marginVertical: Space[2] },
  themeRow: { flexDirection: 'row', gap: Space[2] },
  linkList: { flexGrow: 1, gap: Space[2] },
  linkRow: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space[3], minHeight: 48, paddingVertical: Space[2], paddingHorizontal: Space[4], borderRadius: Radii.md, borderWidth: 1 },
  linkRowCopy: { flex: 1, minWidth: 0 },
  linkRowDescription: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular },
  linkRowText: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: Space[3], padding: Space[3], borderRadius: Radii.md, borderWidth: 1 },
  roleName: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  roleText: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans.regular },
  vaultNote: { flexDirection: 'row', gap: Space[3], padding: Space[3], borderRadius: Radii.md },
});
