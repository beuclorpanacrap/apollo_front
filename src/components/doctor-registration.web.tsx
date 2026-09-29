import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppMark } from './app-mark';
import { AppTheme, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import type { RegisterDoctorRequest } from '@/api/auth.api';
import { ApiError } from '@/api/client';

const CLINICIAN_ROLES = [
  { value: 'GENERAL_PRACTITIONER', label: 'General practitioner' },
  { value: 'SPECIALIST', label: 'Specialist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab technician' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
] as const;

type Fields = Omit<RegisterDoctorRequest, 'doctorRole'>;
const EMPTY_FIELDS: Fields = { firstName: '', lastName: '', email: '', password: '', licenseNumber: '', specialty: '' };

export default function DoctorRegistration() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const stacked = width < 900;
  const narrow = width < 600;
  const router = useRouter();
  const { registerDoctor } = useAuth();
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [doctorRole, setDoctorRole] = useState<RegisterDoctorRequest['doctorRole']>('GENERAL_PRACTITIONER');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (submitting.current) return;
    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!value.trim()) errors[key] = 'This field is required.';
    }
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = 'Enter a valid email address.';
    if (fields.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(fields.password)) {
      errors.password = 'Use at least 8 characters with uppercase, lowercase, a number, and a symbol.';
    }
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await registerDoctor({
        firstName: fields.firstName.trim(), lastName: fields.lastName.trim(),
        email: fields.email.trim(), password: fields.password,
        licenseNumber: fields.licenseNumber.trim(), specialty: fields.specialty.trim(), doctorRole,
      });
      router.replace('/doctor');
    } catch (err) {
      if (err instanceof ApiError && err.data?.fieldErrors) setFieldErrors(err.data.fieldErrors);
      setError(err instanceof ApiError && err.status === 409
        ? 'This email address or license number is already registered. Sign in or check your details.'
        : err instanceof Error ? err.message : 'We could not create your account. Please try again.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const field = (key: keyof Fields, label: string, placeholder: string, paired = false) => (
    <View style={[styles.field, paired && !narrow && styles.pairedField]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, fieldErrors[key] && { borderColor: theme.danger }]}>
        <TextInput accessibilityLabel={label} style={styles.input} value={fields[key]}
          onChangeText={(value) => {
            setFields((previous) => ({ ...previous, [key]: value }));
            setFieldErrors((previous) => { const next = { ...previous }; delete next[key]; return next; });
          }}
          placeholder={placeholder} placeholderTextColor={theme.textTertiary} editable={!isSubmitting}
          autoCapitalize={key === 'email' || key === 'password' ? 'none' : 'words'}
          autoCorrect={false} keyboardType={key === 'email' ? 'email-address' : 'default'}
          autoComplete={key === 'password' ? 'new-password' : key === 'email' ? 'email' : key === 'firstName' ? 'given-name' : key === 'lastName' ? 'family-name' : 'off'}
          secureTextEntry={key === 'password' && !showPassword} onSubmitEditing={handleSubmit} />
        {key === 'password' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} style={styles.eye} onPress={() => setShowPassword((value) => !value)}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textSecondary} />
        </TouchableOpacity>}
      </View>
      {fieldErrors[key] && <Text accessibilityRole="alert" style={styles.errorText}>{fieldErrors[key]}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.container, narrow && styles.narrowContainer]} keyboardShouldPersistTaps="handled">
      <TouchableOpacity accessibilityRole="button" disabled={isSubmitting} onPress={() => router.replace('/sign-up')} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.tintStrong} /><Text style={styles.link}>Change account type</Text>
      </TouchableOpacity>
      <View style={[styles.layout, stacked && styles.stackedLayout]}>
        <View style={[styles.intro, !stacked && styles.desktopIntro]}>
          <AppMark size={stacked ? 40 : 56} />
          <Text style={styles.eyebrow}>APOLLO FOR CLINICIANS</Text>
          <Text style={[styles.title, stacked && styles.compactTitle]}>A dedicated space for patient care.</Text>
          <Text style={styles.description}>Create your professional account for Apollo’s web-based clinical workspace.</Text>
          {!stacked && <View style={styles.features}>
          <View style={styles.feature}><Ionicons name="desktop-outline" size={22} color={theme.tintStrong} /><Text style={styles.featureText}>Designed for your desktop workflow</Text></View>
          <View style={styles.feature}><Ionicons name="key-outline" size={22} color={theme.tintStrong} /><Text style={styles.featureText}>Patient access through a consultation PIN</Text></View>
          <View style={styles.feature}><Ionicons name="medical-outline" size={22} color={theme.tintStrong} /><Text style={styles.featureText}>A separate account for your clinical work</Text></View>
          </View>}
        </View>
        <View style={[styles.form, !stacked && styles.desktopForm, narrow && styles.narrowForm]}>
          <Text style={styles.formTitle}>Create your doctor account</Text>
          <Text style={styles.description}>Enter your account and professional details. All fields are required.</Text>
          {error && <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text>}
          <Text style={styles.sectionTitle}>Account details</Text>
          <View style={[styles.row, narrow && { flexDirection: 'column' }]}>
            {field('firstName', 'First name', 'First name', true)}{field('lastName', 'Last name', 'Last name', true)}
          </View>
          {field('email', 'Email address', 'you@clinic.org')}
          {field('password', 'Password', 'Create a strong password')}
          <Text style={styles.hint}>At least 8 characters, including uppercase, lowercase, a number, and a symbol.</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Professional details</Text>
          {field('licenseNumber', 'License number', 'Your professional license number')}
          {field('specialty', 'Specialty', 'e.g. General medicine')}
          <Text style={styles.label}>Clinical role</Text>
          <View style={styles.roles}>
            {CLINICIAN_ROLES.map((role) => <TouchableOpacity key={role.value} accessibilityRole="radio" accessibilityLabel={role.label}
              accessibilityState={{ checked: doctorRole === role.value, disabled: isSubmitting }} disabled={isSubmitting}
              onPress={() => setDoctorRole(role.value)} style={[styles.role, narrow && styles.narrowRole, doctorRole === role.value && styles.selectedRole]}>
              <Ionicons name={doctorRole === role.value ? 'radio-button-on' : 'radio-button-off'} size={18} color={theme.tintStrong} />
              <Text style={styles.roleLabel}>{role.label}</Text>
            </TouchableOpacity>)}
          </View>
          {fieldErrors.doctorRole && <Text accessibilityRole="alert" style={styles.errorText}>{fieldErrors.doctorRole}</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create doctor account" disabled={isSubmitting} onPress={handleSubmit} style={[styles.submit, isSubmitting && { opacity: 0.65 }]}>
            {isSubmitting ? <ActivityIndicator color={theme.onTint} /> : <><Text style={styles.submitText}>Create doctor account</Text><Ionicons name="arrow-forward" size={18} color={theme.onTint} /></>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="link" disabled={isSubmitting} onPress={() => router.push('/sign-in')} style={styles.signIn}>
            <Text style={styles.description}>Already registered? <Text style={styles.link}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  container: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  narrowContainer: { padding: 16, paddingBottom: 24 },
  back: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 12, alignSelf: 'flex-start', marginBottom: 20 },
  link: { color: theme.tintStrong, fontFamily: Fonts.sans.semiBold, fontSize: 14 },
  layout: { flexDirection: 'row', gap: 32, alignItems: 'flex-start', width: '100%', flexShrink: 0 },
  stackedLayout: { flexDirection: 'column', gap: 24 },
  intro: { width: '100%', minWidth: 0, gap: 12, flexShrink: 0 },
  desktopIntro: { width: '34%', maxWidth: 360, paddingTop: 20 },
  eyebrow: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 11, lineHeight: 17, letterSpacing: 1.5, color: theme.tintStrong },
  title: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 32, lineHeight: 42, color: theme.text },
  compactTitle: { fontSize: 26, lineHeight: 34 },
  description: { fontFamily: Fonts.sans.regular, fontSize: 14, lineHeight: 23, color: theme.textSecondary },
  features: { gap: 16, marginTop: 16 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { flex: 1, fontFamily: Fonts.sans.medium, fontSize: 14, lineHeight: 22, color: theme.text },
  form: { width: '100%', minWidth: 0, flexShrink: 0, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement, gap: 12 },
  desktopForm: { flex: 1, width: 'auto' },
  narrowForm: { padding: 16 },
  formTitle: { fontFamily: Fonts.sans.bold, fontWeight: '700', fontSize: 22, lineHeight: 30, color: theme.text },
  sectionTitle: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 15, lineHeight: 22, color: theme.text, marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, flexShrink: 0 },
  field: { width: '100%', minWidth: 0, flexShrink: 0, gap: 6 },
  pairedField: { flex: 1, width: 'auto' },
  label: { fontFamily: Fonts.sans.medium, fontWeight: '500', fontSize: 13, lineHeight: 19, color: theme.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 9, backgroundColor: theme.background },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, lineHeight: 22, color: theme.text, fontFamily: Fonts.sans.regular, fontSize: 14 },
  eye: { padding: 12 },
  hint: { fontFamily: Fonts.sans.regular, fontSize: 12, lineHeight: 18, color: theme.textSecondary },
  divider: { height: 1, backgroundColor: theme.border, marginTop: 12 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  role: { flexBasis: '45%', flexGrow: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  narrowRole: { flexBasis: '100%' },
  selectedRole: { backgroundColor: theme.pillGreenBg, borderColor: theme.tintStrong },
  roleLabel: { fontFamily: Fonts.sans.medium, fontSize: 13, lineHeight: 19, color: theme.text, flexShrink: 1 },
  errorText: { fontFamily: Fonts.sans.regular, fontSize: 12, lineHeight: 18, color: theme.danger },
  errorBanner: { color: theme.danger, backgroundColor: theme.dangerBg, padding: 14, borderRadius: 8, lineHeight: 22, fontFamily: Fonts.sans.regular },
  submit: { backgroundColor: theme.tint, padding: 15, borderRadius: 10, flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitText: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.onTint, fontSize: 15, lineHeight: 22, flexShrink: 1, textAlign: 'center' },
  signIn: { alignItems: 'center', padding: 8 },
});
