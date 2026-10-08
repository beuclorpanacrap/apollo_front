import { useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { RegisterDoctorRequest } from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { AppMark } from '@/components/app-mark';
import { PortalShell } from '@/components/portal/portal-shell';
import { Badge, IconBubble } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioCards, TextField } from '@/components/ui/form-field';
import { useInteractive } from '@/components/ui/interactive';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Fonts, Radii, Space } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTheme } from '@/hooks/use-theme';
import { DOCTOR_ROLE_LABELS, type DoctorRole } from '@/utils/clinician-format';
import { clinicianSignInHref } from '@/utils/portal-routes';
import { webProps } from '@/utils/web-props';

export { PortalErrorBoundary as ErrorBoundary } from '@/components/portal/route-error';

const TITLE = 'Create a clinician account · Apollo';
const CLINICIAN_ROLES = (Object.entries(DOCTOR_ROLE_LABELS) as [DoctorRole, string][]).map(([value, label]) => ({ value, label }));

type Fields = Omit<RegisterDoctorRequest, 'doctorRole'>;
const EMPTY_FIELDS: Fields = { firstName: '', lastName: '', email: '', password: '', licenseNumber: '', specialty: '' };
const FIELD_ORDER: (keyof Fields)[] = ['firstName', 'lastName', 'email', 'password', 'licenseNumber', 'specialty'];

const FEATURES = [
  { icon: 'desktop-outline', text: 'Designed for your desktop workflow' },
  { icon: 'key-outline', text: 'Patient access through a consultation PIN' },
  { icon: 'medical-outline', text: 'A separate account for your clinical work' },
] as const;

export default function DoctorRegistration() {
  return (
    <PortalShell active="public" title={TITLE}>
      <RegistrationForm />
    </PortalShell>
  );
}

function RegistrationForm() {
  const theme = useTheme();
  const fx = useInteractive();
  const { width } = useBreakpoint();
  const stacked = width < 900;
  const narrow = width < 600;
  const router = useRouter();
  const { registerDoctor } = useAuth();
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [doctorRole, setDoctorRole] = useState<DoctorRole>('GENERAL_PRACTITIONER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Validation rules and error mapping are unchanged from the original registration screen.
  const handleSubmit = async () => {
    if (submitting.current) return;
    const errors: Record<string, string> = {};
    for (const key of FIELD_ORDER) {
      if (!fields[key].trim()) errors[key] = 'This field is required.';
    }
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = 'Enter a valid email address.';
    if (fields.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(fields.password)) {
      errors.password = 'Use at least 8 characters with uppercase, lowercase, a number, and a symbol.';
    }
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) {
      const first = FIELD_ORDER.find((key) => errors[key]);
      if (first) document.getElementById(`reg-${first}`)?.focus();
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await registerDoctor({
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        email: fields.email.trim(),
        password: fields.password,
        licenseNumber: fields.licenseNumber.trim(),
        specialty: fields.specialty.trim(),
        doctorRole,
      });
      router.replace('/doctor');
    } catch (err) {
      if (err instanceof ApiError && err.data?.fieldErrors) setFieldErrors(err.data.fieldErrors);
      setError(
        err instanceof ApiError && err.status === 409
          ? 'This email address or license number is already registered. Sign in or check your details.'
          : err instanceof Error
            ? err.message
            : 'We could not create your account. Please try again.',
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const input = (key: keyof Fields, label: string, placeholder: string, extra: Partial<ComponentProps<typeof TextField>> = {}) => (
    <TextField
      id={`reg-${key}`}
      label={label}
      placeholder={placeholder}
      value={fields[key]}
      error={fieldErrors[key] ?? null}
      disabled={isSubmitting}
      onChangeText={(value) => {
        setFields((previous) => ({ ...previous, [key]: value }));
        setFieldErrors((previous) => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
      }}
      onEnter={handleSubmit}
      {...extra}
    />
  );

  return (
    <View style={styles.page}>
      <View style={styles.backRow}>
        <Button label="Change account type" icon="arrow-back" variant="ghost" size="compact" portal disabled={isSubmitting} onPress={() => router.replace('/sign-up')} />
      </View>

      <View style={[styles.layout, stacked ? styles.stacked : null]}>
        <View style={[styles.intro, !stacked ? styles.desktopIntro : null]}>
          <AppMark size={stacked ? 44 : 60} />
          <Badge size="md" label="Apollo for clinicians" icon="medkit-outline" bg={theme.pillGreenBg} fg={theme.pillGreenText} />
          <Text role="heading" {...webProps({ 'aria-level': 1 })} style={[styles.title, stacked ? styles.compactTitle : null, { color: theme.text }]}>
            A dedicated space for patient care.
          </Text>
          <Text style={[styles.lead, { color: theme.textMuted }]}>Create your professional account for Apollo’s web-based clinical workspace.</Text>
          {!stacked ? (
            <View style={styles.features}>
              {FEATURES.map((feature) => (
                <View key={feature.text} style={styles.feature}>
                  <IconBubble icon={feature.icon} bg={theme.pillGreenBg} fg={theme.accentText} size={40} />
                  <Text style={[styles.featureText, { color: theme.text }]}>{feature.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Card variant="portal" style={[styles.form, !stacked ? styles.desktopForm : null, narrow ? { padding: Space[5] } : null]} {...webProps({ 'aria-busy': isSubmitting || undefined })}>
          <View style={{ gap: 4 }}>
            <Text role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.formTitle, { color: theme.text }]}>
              Create your doctor account
            </Text>
            <Text style={[styles.lead, { color: theme.textMuted }]}>Enter your account and professional details. All fields are required.</Text>
          </View>

          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

          <Text style={[styles.section, { color: theme.text }]}>Account details</Text>
          <View style={[styles.pair, narrow ? { flexDirection: 'column' } : null]}>
            <View style={{ flex: 1, minWidth: 0 }}>{input('firstName', 'First name', 'First name', { autoComplete: 'given-name' })}</View>
            <View style={{ flex: 1, minWidth: 0 }}>{input('lastName', 'Last name', 'Last name', { autoComplete: 'family-name' })}</View>
          </View>
          {input('email', 'Email address', 'you@clinic.org', { type: 'email', inputMode: 'email', autoComplete: 'email', spellCheck: false })}
          {input('password', 'Password', 'Create a strong password', {
            type: 'password',
            autoComplete: 'new-password',
            revealable: true,
            help: 'At least 8 characters, including uppercase, lowercase, a number, and a symbol.',
          })}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Text style={[styles.section, { color: theme.text }]}>Professional details</Text>
          {input('licenseNumber', 'License number', 'Your professional license number', { autoComplete: 'off' })}
          {input('specialty', 'Specialty', 'e.g. General medicine', { autoComplete: 'off' })}
          <RadioCards
            legend="Clinical role"
            name="doctorRole"
            value={doctorRole}
            onValueChange={(value) => setDoctorRole(value as DoctorRole)}
            options={CLINICIAN_ROLES}
            disabled={isSubmitting}
            error={fieldErrors.doctorRole ?? null}
            columns={narrow ? 1 : 2}
          />

          <Button label="Create doctor account" icon="arrow-forward" portal fullWidth loading={isSubmitting} onPress={handleSubmit} />
          <View style={styles.signInRow}>
            <Text style={[styles.lead, { color: theme.textMuted }]}>Already registered?</Text>
            <Pressable
              accessibilityRole="link"
              disabled={isSubmitting}
              onPress={() => router.push(clinicianSignInHref())}
              style={({ focused }: { focused?: boolean }) => [styles.textLink, focused && fx.keyboard ? fx.ring(theme, { pressed: false, hovered: false, focused: true }) : null]}
            >
              <Text style={[styles.textLinkLabel, { color: theme.accentText }]}>Sign in</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space[5] },
  backRow: { alignItems: 'flex-start' },
  layout: { flexDirection: 'row', gap: Space[8], alignItems: 'flex-start', width: '100%' },
  stacked: { flexDirection: 'column', gap: Space[6] },
  intro: { width: '100%', minWidth: 0, gap: Space[4] },
  desktopIntro: { width: '34%', maxWidth: 380, paddingTop: Space[5] },
  title: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 36, lineHeight: 44, letterSpacing: -0.6 },
  compactTitle: { fontSize: 28, lineHeight: 36 },
  lead: { fontFamily: Fonts.sans.regular, fontSize: 15, lineHeight: 23 },
  features: { gap: Space[4], marginTop: Space[3] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Space[3] },
  featureText: { flex: 1, fontFamily: Fonts.sans.medium, fontWeight: '500', fontSize: 15, lineHeight: 22 },
  form: { width: '100%', minWidth: 0, gap: Space[4] },
  desktopForm: { flex: 1, width: 'auto' },
  formTitle: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 22, lineHeight: 30, letterSpacing: -0.3 },
  section: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 15, lineHeight: 22, marginTop: Space[1] },
  pair: { flexDirection: 'row', gap: Space[4] },
  divider: { height: 1, marginVertical: Space[1], borderRadius: Radii.xs },
  textLink: { minHeight: 44, minWidth: 44, paddingHorizontal: 6, justifyContent: 'center', borderRadius: Radii.sm },
  textLinkLabel: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 15, lineHeight: 22, textDecorationLine: 'underline' },
  signInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: Space[1] },
});
