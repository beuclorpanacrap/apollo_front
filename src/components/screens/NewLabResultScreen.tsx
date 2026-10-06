import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DateField } from '../ui/date-field';
import { BottomTabInset, MaxContentWidth, Spacing } from '../../constants/theme';
import { LabResultForm } from '../LabResultForm';
import { Button, Chip, CriticalBanner, font, SectionCard, useLabTheme } from '../LabUI';
import { allFields, evaluateTemplate, isCritical } from '../evaluate';
import { cbc, getTemplate, TEMPLATES } from '../templates';
import type { DraftValues, LabResultPayload, PatientContext, ResultStatus } from '../types';

interface Props {
  /** The patient the result is for. Without it, a demo patient is used. */
  patient?: PatientContext;
  onSave?: (payload: LabResultPayload) => void | Promise<void>;
}

// Date the test was taken: today by default, never in the future.
const DATE_OPTIONS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: -1 },
  { label: '1 week ago', days: -7 },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Demo patient for the standalone screen. In the real flow the unlocked patient is passed in.
const DEMO_PATIENT: PatientContext = { sex: 'female', ageYears: 34 };

export default function NewLabResultScreen({ patient = DEMO_PATIENT, onSave }: Props) {
  const c = useLabTheme();
  const router = useRouter();
  const [templateCode, setTemplateCode] = useState(cbc.code);
  const [values, setValues] = useState<DraftValues>({});
  const [triedToFinalize, setTriedToFinalize] = useState(false);
  const [takenOn, setTakenOn] = useState<string | undefined>(todayIso);

  const dateError = !takenOn
    ? 'Enter the date the test was taken'
    : takenOn > todayIso()
      ? 'The date cannot be in the future'
      : undefined;

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
    if (!takenOn || dateError) return;

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: MaxContentWidth,
        padding: Spacing.four,
        paddingBottom: BottomTabInset + Spacing.six,
        gap: Spacing.four,
      }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={{ gap: Spacing.one }}>
        <Text style={[font('bold'), { color: c.text, fontSize: 24 }]}>Enter lab result</Text>
        <Text style={[font('regular'), { color: c.textSecondary, fontSize: 14 }]}>
          Specimen: {template.specimen}
        </Text>
      </View>

      <SectionCard title="Test">
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Test"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {TEMPLATES.map((t) => (
            <Chip
              key={t.code}
              label={t.name}
              selected={t.code === template.code}
              onPress={() => pickTemplate(t.code)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Date taken">
        <DateField value={takenOn} onChange={setTakenOn} quickOptions={DATE_OPTIONS} />
        {dateError ? (
          <Text accessibilityRole="alert" style={[font('regular'), { color: c.danger, fontSize: 12 }]}>
            {dateError}
          </Text>
        ) : null}
      </SectionCard>

      <CriticalBanner labels={criticalLabels} />

      <LabResultForm
        template={template}
        patient={patient}
        values={values}
        onChange={setValues}
        evaluation={evaluation}
      />

      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Button title="Save draft" variant="secondary" onPress={() => save('draft')} />
        <Button title="Finalize result" variant="primary" onPress={() => save('final')} />
      </View>
    </ScrollView>
  );
}
