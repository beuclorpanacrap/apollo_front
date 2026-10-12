import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HeroChip, PortalHero } from '@/components/portal/portal-hero';
import { PinInput } from '@/components/portal/pin-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Fonts, Radii, Space, elevationStyle, withAlpha } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useGreeting } from '@/hooks/use-greeting';
import { useMinuteClock } from '@/hooks/use-minute-clock';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { DOCTOR_ROLE_LABELS, isDoctorRole } from '@/utils/clinician-format';
import { webProps } from '@/utils/web-props';

type Props = {
  doctorName: string;
  specialty?: string;
  doctorRole?: string;
  digits: string[];
  onDigitsChange: (next: string[]) => void;
  onEdit: () => void;
  onUnlock: () => void;
  onCancel: () => void;
  status: 'idle' | 'validating';
  slow: boolean;
  error: string;
  expiredNotice: boolean;
  focusRequest: number;
};

const STEPS = [
  { icon: 'key-outline', title: 'Receive a PIN', body: 'The patient generates a single-use, 6-digit PIN in the Apollo app and shares it with you.' },
  { icon: 'document-text-outline', title: 'Review the record', body: 'Enter the PIN to open their vault: allergies, conditions, encounters, prescriptions and lab results.' },
  { icon: 'create-outline', title: 'Document care', body: 'Add encounters, prescriptions and lab results during the consultation. Access ends when the session expires.' },
] as const;

/** The locked workspace: greeting hero, a composed unlock card and the three-step "how it works" sequence. */
export function LockedView({
  doctorName,
  specialty,
  doctorRole,
  digits,
  onDigitsChange,
  onEdit,
  onUnlock,
  onCancel,
  status,
  slow,
  error,
  expiredNotice,
  focusRequest,
}: Props) {
  const theme = useTheme();
  const { width } = useBreakpoint();
  const greeting = useGreeting();
  const wide = width >= 900;
  const validating = status === 'validating';
  const complete = digits.join('').length === 6;

  return (
    <View style={styles.page}>
      <PortalHero
        eyebrow={greeting}
        eyebrowIcon="sunny-outline"
        title={doctorName}
        subtitle="Patient-authorized access. Everything you need for the next consultation."
        aside={wide ? <TodayBlock /> : undefined}
        chips={
          <>
            <HeroChip icon="shield-checkmark-outline" label="Clinician workspace" />
            {isDoctorRole(doctorRole) ? <HeroChip icon="medkit-outline" label={DOCTOR_ROLE_LABELS[doctorRole]} /> : null}
            {specialty ? <HeroChip icon="school-outline" label={specialty} /> : null}
          </>
        }
      />

      <View style={[styles.columns, wide ? styles.columnsWide : null]}>
        {/* ------------------------------------------------------------ unlock card */}
        <View style={[styles.unlockCol, wide ? { flex: 1.45 } : null]}>
          <Card variant="portal" style={styles.unlockCard} {...webProps({ 'aria-busy': validating || undefined })}>
            <Illustration />
            <View style={styles.unlockBody}>
              <View style={{ gap: 4 }}>
                <Text role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.h2, { color: theme.text }]}>
                  Unlock a patient vault
                </Text>
                <Text style={[styles.lead, { color: theme.textMuted }]}>
                  Ask your patient to generate a consultation PIN in the Apollo app and read it to you.
                </Text>
              </View>

              {expiredNotice ? (
                <InlineAlert tone="warning" title="Vault access has expired">
                  Ask the patient for a new PIN to open their vault again.
                </InlineAlert>
              ) : null}

              <View style={{ gap: Space[3] }}>
                <Text id="pin-label" style={[styles.label, { color: theme.text }]}>
                  Patient access PIN
                </Text>
                <PinInput
                  value={digits}
                  onChange={onDigitsChange}
                  onEdit={onEdit}
                  onSubmit={onUnlock}
                  readOnly={validating}
                  invalid={!!error}
                  labelId="pin-label"
                  describedBy="pin-help pin-status"
                  focusRequest={focusRequest}
                />
                <View style={styles.helperRow}>
                  <Ionicons name="time-outline" size={16} color={theme.textMuted} />
                  <Text id="pin-help" style={[styles.helper, { color: theme.textMuted }]}>
                    PINs are single-use and expire after 15 minutes.
                  </Text>
                </View>
              </View>

              <View id="pin-status" role="status" aria-live="polite" style={{ gap: Space[3] }}>
                {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
                {slow && validating ? (
                  <InlineAlert tone="info" title="Still working…" action={{ label: 'Cancel', onPress: onCancel }}>
                    The server may be waking up, which can take up to a minute. Please keep this page open.
                  </InlineAlert>
                ) : null}
              </View>

              <Button
                label={validating ? 'Validating PIN…' : 'Unlock patient vault'}
                icon="lock-open-outline"
                portal
                fullWidth
                loading={validating}
                disabled={!complete}
                onPress={onUnlock}
              />

              <View style={styles.privacy}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.accentText} />
                <Text style={[styles.privacyText, { color: theme.textMuted }]}>
                  Records are only accessible with the patient’s authorization.
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* ------------------------------------------------------------ how it works */}
        <View style={[styles.howCol, wide ? { flex: 1 } : null]}>
          <Card variant="portal" style={styles.how}>
            <Text role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.h2, { color: theme.text }]}>
              How it works
            </Text>
            <View role="list" style={{ marginTop: Space[2] }}>
              {STEPS.map((step, index) => (
                <View key={step.title} role="listitem" style={styles.step}>
                  <View style={styles.stepRail}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.pillGreenBg }]}>
                      <Text style={[styles.stepNumberText, { color: theme.accentText }]}>{index + 1}</Text>
                    </View>
                    {index < STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: theme.border }]} /> : null}
                  </View>
                  <View style={styles.stepBody}>
                    <View style={styles.stepTitleRow}>
                      <Ionicons name={step.icon} size={16} color={theme.accentText} />
                      <Text role="heading" {...webProps({ 'aria-level': 3 })} style={[styles.stepTitle, { color: theme.text }]}>
                        {step.title}
                      </Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.textMuted }]}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={[styles.note, { backgroundColor: theme.surfaceMuted }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.accentText} style={{ marginTop: 1 }} />
              <Text style={[styles.noteText, { color: theme.text }]}>
                Access starts with the patient. You can’t browse patients or open a vault without their PIN.
              </Text>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

/** Weekday + date on the hero (refreshes with the greeting's minute clock). */
function TodayBlock() {
  const theme = useTheme();
  const now = useMinuteClock();
  return (
    <View style={styles.today} accessible accessibilityLabel={`Today is ${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`}>
      <Text style={[styles.todayWeekday, { color: theme.heroTextMuted }]}>{now.toLocaleDateString(undefined, { weekday: 'long' })}</Text>
      <Text style={[styles.todayDate, { color: theme.heroText }]}>{now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Text>
    </View>
  );
}

/** Calm illustration: a lock at the centre of quiet rings with three record icons orbiting it (Ionicons + token colors only). */
function Illustration() {
  const theme = useTheme();
  const isDark = useIsDark();
  const ring = withAlpha(theme.accentText, 0.16);
  const satellite = (style: object, bg: string, fg: string, icon: 'key-outline' | 'heart-outline' | 'document-text-outline') => (
    <View style={[styles.satellite, { backgroundColor: bg, borderColor: theme.backgroundElement }, style]}>
      <Ionicons name={icon} size={18} color={fg} />
    </View>
  );
  return (
    <View aria-hidden style={[styles.band, { backgroundColor: theme.pillGreenBg }]}>
      <View style={[styles.orbit, { width: 260, height: 260, borderColor: ring }]} />
      <View style={[styles.orbit, { width: 176, height: 176, borderColor: ring }]} />
      <View style={[styles.orbit, { width: 112, height: 112, borderColor: ring, backgroundColor: withAlpha(theme.accentText, 0.06) }]} />
      <View style={[styles.lockDisc, { backgroundColor: theme.tintStrong, borderColor: theme.backgroundElement }, elevationStyle('raised', isDark)]}>
        <Ionicons name="lock-closed" size={30} color={theme.onTint} />
      </View>
      {satellite({ left: '16%', top: 34 }, theme.pillMarigoldBg, theme.pillMarigoldText, 'key-outline')}
      {satellite({ right: '17%', top: 26 }, theme.pillClayBg, theme.pillClayText, 'document-text-outline')}
      {satellite({ right: '27%', bottom: 18 }, theme.pillPlumBg, theme.pillPlumText, 'heart-outline')}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space[6] },
  today: { alignItems: 'flex-end', paddingRight: Space[4] },
  todayWeekday: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  todayDate: { fontSize: 24, lineHeight: 30, fontFamily: Fonts.display, fontWeight: '800', letterSpacing: -0.4 },
  columns: { gap: Space[6] },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  unlockCol: { minWidth: 0 },
  howCol: { minWidth: 0 },
  unlockCard: { padding: 0, overflow: 'hidden' },
  unlockBody: { padding: Space[6], gap: Space[5] },
  band: { height: 156, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbit: { position: 'absolute', borderRadius: 999, borderWidth: 1.5 },
  lockDisc: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  satellite: { position: 'absolute', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.3 },
  lead: { fontSize: 15, lineHeight: 23, fontFamily: Fonts.sans.regular },
  label: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helper: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.regular, flex: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  privacyText: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.regular, flexShrink: 1, textAlign: 'center' },
  how: { gap: Space[3] },
  step: { flexDirection: 'row', gap: Space[4] },
  stepRail: { alignItems: 'center', width: 32 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 14, lineHeight: 18, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  stepLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 4, borderRadius: 1 },
  stepBody: { flex: 1, minWidth: 0, paddingBottom: Space[5], gap: 4 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  stepTitle: { fontSize: 15, lineHeight: 22, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  stepText: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans.regular },
  note: { flexDirection: 'row', gap: 10, padding: Space[4], borderRadius: Radii.md, marginTop: Space[1] },
  noteText: { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: Fonts.sans.regular },
});
