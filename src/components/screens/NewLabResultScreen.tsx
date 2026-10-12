import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BottomTabInset, MaxContentWidth, Spacing } from '../../constants/theme';
import { LabResultForm } from '../LabResultForm';
import { Button, Chip, CriticalBanner, font, SectionCard, useLabTheme } from '../LabUI';
import { allFields, evaluateTemplate, isCritical } from '../evaluate';
import { ThemedDatePicker } from '../themed-date-picker';
import { cbc, getTemplate, TEMPLATES } from '../templates';
import type { DraftValues, LabResultPayload, PatientContext, ResultStatus } from '../types';

interface Props {
  /** The patient the result is for. Without it, a demo patient is used. */
  patient?: PatientContext;
  onSave?: (payload: LabResultPayload) => void | Promise<void>;
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DATE_SHORTCUTS = [
  { label: 'Today', daysAgo: 0 },
  { label: 'Yesterday', daysAgo: 1 },
  { label: '1 week ago', daysAgo: 7 },
];

const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIso(d);
};

// Noon avoids the date shifting across time zones.
const fromIso = (iso: string) => new Date(`${iso}T12:00:00`);

const formatDate = (iso: string) =>
  fromIso(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// Demo patient for the standalone screen. In the real flow the unlocked patient is passed in.
const DEMO_PATIENT: PatientContext = { sex: 'female', ageYears: 34 };

/** Side navbar with the test picker; below this much window width it moves into the page instead. */
const SIDEBAR_WIDTH = 312;
const WIDE_BREAKPOINT = 960;

export default function NewLabResultScreen({ patient = DEMO_PATIENT, onSave }: Props) {
  const c = useLabTheme();
  const router = useRouter();
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;
  const [templateCode, setTemplateCode] = useState(cbc.code);
  const [values, setValues] = useState<DraftValues>({});
  const [triedToFinalize, setTriedToFinalize] = useState(false);
  // Date the test was taken: today by default, never in the future (the picker stops later days).
  const [takenOn, setTakenOn] = useState(() => toIso(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const template = getTemplate(templateCode) ?? cbc;

  // Recomputed on every keystroke: cheap, and it drives the live flags.
  const evaluation = useMemo(
    () => evaluateTemplate(template, values, patient, { requireComplete: triedToFinalize }),
    [template, values, patient, triedToFinalize],
  );

  const criticalLabels = useMemo(() => {
    const labels = new Map(allFields(template).map((f) => [f.key, f.label] as const));
    return evaluation.entries.filter((e) => isCritical(e.flag)).map((e) => labels.get(e.key) ?? e.key);
  }, [template, evaluation]);

  function pickTemplate(code: string) {
    setTemplateCode(code);
    setValues({});
    setTriedToFinalize(false);
  }

  async function save(status: ResultStatus) {
    const finalizing = status === 'final';
    if (finalizing) setTriedToFinalize(true);

    const result = evaluateTemplate(template, values, patient, { requireComplete: finalizing });
    if (result.entries.length === 0 || Object.keys(result.errors).length > 0) return;

    const payload: LabResultPayload = {
      takenOn,
      templateCode: template.code,
      templateVersion: template.version,
      status,
      entries: result.entries,
    };
    if (onSave) {
      await onSave(payload);
      router.back();
      return;
    }
    // Keep the standalone screen useful in the sandbox and component tests.
    console.log(JSON.stringify(payload, null, 2));
  }

  const dateCard = (
        <SectionCard title="Date taken">
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Date shortcuts"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {DATE_SHORTCUTS.map(({ label, daysAgo }) => (
              <Chip
                key={label}
                label={label}
                selected={takenOn === daysAgoIso(daysAgo)}
                onPress={() => setTakenOn(daysAgoIso(daysAgo))}
              />
            ))}
          </View>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Date taken"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              backgroundColor: c.background,
              paddingHorizontal: 19,
              paddingVertical: 12,
            }}>
            <Text style={[font('medium'), { color: c.text, fontSize: 18 }]}>{formatDate(takenOn)}</Text>
            <Ionicons name="calendar-outline" size={24} color={c.textTertiary} />
          </Pressable>
          <ThemedDatePicker
            visible={showDatePicker}
            value={fromIso(takenOn)}
            maximumDate={new Date()}
            onClose={() => setShowDatePicker(false)}
            onChange={(date) => setTakenOn(toIso(date))}
          />
        </SectionCard>
  );

  const testNav = (
    <View accessibilityRole="radiogroup" accessibilityLabel="Test" style={{ gap: 5 }}>
      {TEMPLATES.map((t) => {
        const selected = t.code === template.code;
        return (
          <Pressable
            key={t.code}
            accessibilityRole="radio"
            accessibilityLabel={t.name}
            accessibilityState={{ selected }}
            onPress={() => pickTemplate(t.code)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 10,
              paddingHorizontal: 19,
              paddingVertical: 14,
              backgroundColor: selected ? c.tint : pressed ? c.backgroundSelected : 'transparent',
            })}>
            <Text
              style={[
                font(selected ? 'semiBold' : 'medium'),
                { color: selected ? c.onTint : c.text, fontSize: 18, flexShrink: 1 },
              ]}>
              {t.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: c.background }}>
      {wide ? (
        // Side navbar: full height, one test per line.
        <View
          style={{
            width: SIDEBAR_WIDTH,
            backgroundColor: c.backgroundElement,
            borderRightWidth: 1,
            borderRightColor: c.border,
            padding: 19,
            gap: 19,
          }}>
          <Text
            style={[
              font('bold'),
              {
                color: c.textSecondary,
                fontSize: 14,
                letterSpacing: 1,
                textTransform: 'uppercase',
                paddingHorizontal: 19,
                paddingTop: 10,
              },
            ]}>
            Test
          </Text>
          {testNav}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: MaxContentWidth * 1.2,
          padding: Spacing.four,
          paddingBottom: BottomTabInset + Spacing.six,
          gap: Spacing.four,
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={{ gap: Spacing.one }}>
          <Text style={[font('bold'), { color: c.text, fontSize: 29 }]}>Enter lab result</Text>
          <Text style={[font('regular'), { color: c.textSecondary, fontSize: 17 }]}>
            Specimen: {template.specimen}
          </Text>
        </View>

        <CriticalBanner labels={criticalLabels} />

        {wide ? null : <SectionCard title="Test">{testNav}</SectionCard>}

        <LabResultForm
          template={template}
          patient={patient}
          values={values}
          onChange={setValues}
          evaluation={evaluation}
          leading={dateCard}
        />

        <View style={{ flexDirection: 'row', gap: Spacing.three, maxWidth: 480 }}>
          <Button title="Save draft" variant="secondary" onPress={() => save('draft')} />
          <Button title="Finalize result" variant="primary" onPress={() => save('final')} />
        </View>
      </ScrollView>
    </View>
  );
}
