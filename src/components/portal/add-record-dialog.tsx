import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError, apiClient } from '@/api/client';
import type { components } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { DateField, TextArea, TextField } from '@/components/ui/form-field';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Fonts, Motion, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecordKind } from '@/context/clinician-vault-context';
import {
  parseDecimal,
  toDateInputValue,
  toDateTimeInputValue,
  toIsoOrNull,
  type Encounter,
  type LabResult,
  type Prescription,
} from '@/utils/clinician-format';

type Schemas = components['schemas'];

export type SavedRecord =
  | { kind: 'encounter'; record: Encounter }
  | { kind: 'prescription'; record: Prescription }
  | { kind: 'lab'; record: LabResult };

type Values = Record<string, string>;
type Errors = Record<string, string>;

const NOTES_MAX = 2000;
const SHORT_MAX = 255;

const TITLES: Record<RecordKind, { title: string; icon: 'calendar-outline' | 'medical-outline' | 'flask-outline'; noun: string }> = {
  encounter: { title: 'Add encounter', icon: 'calendar-outline', noun: 'encounter' },
  prescription: { title: 'Add prescription', icon: 'medical-outline', noun: 'prescription' },
  lab: { title: 'Add lab result', icon: 'flask-outline', noun: 'lab result' },
};

const initialValues = (kind: RecordKind): Values =>
  kind === 'encounter'
    ? { diagnosis: '', clinicalNotes: '', encounterDate: toDateInputValue() }
    : kind === 'prescription'
      ? // "Valid until" has no default on purpose: how long a prescription lasts is a clinical decision.
        { medicationName: '', dosage: '', instructions: '', expiresAt: '' }
      : { testName: '', numericValue: '', unit: '', recordedAt: toDateTimeInputValue() };

/** Field order drives which invalid field receives focus first. */
const FIELD_ORDER: Record<RecordKind, string[]> = {
  encounter: ['diagnosis', 'clinicalNotes', 'encounterDate'],
  prescription: ['medicationName', 'dosage', 'instructions', 'expiresAt'],
  lab: ['testName', 'numericValue', 'unit', 'recordedAt'],
};

function validate(kind: RecordKind, v: Values): Errors {
  const errors: Errors = {};
  const need = (name: string, message: string) => {
    if (!v[name]?.trim()) errors[name] = message;
  };
  if (kind === 'encounter') {
    need('diagnosis', 'Enter the diagnosis.');
    need('clinicalNotes', 'Enter the clinical notes.');
    if (!v.encounterDate) errors.encounterDate = 'Choose the encounter date.';
    else if (toIsoOrNull(`${v.encounterDate}T00:00`) === null) errors.encounterDate = 'Enter a valid date.';
  } else if (kind === 'prescription') {
    need('medicationName', 'Enter the medication and strength.');
    need('dosage', 'Enter the dosage.');
    need('instructions', 'Enter the instructions for the patient and pharmacy.');
    if (!v.expiresAt) errors.expiresAt = 'Choose until when this prescription is valid.';
    else if (toIsoOrNull(v.expiresAt) === null) errors.expiresAt = 'Enter a valid date and time.';
  } else {
    need('testName', 'Enter the test name.');
    if (!v.numericValue.trim()) errors.numericValue = 'Enter the result.';
    else if (parseDecimal(v.numericValue) === null) errors.numericValue = 'Enter a number, for example 95.5.';
    need('unit', 'Enter the unit, for example mg/dL.');
    if (!v.recordedAt) errors.recordedAt = 'Choose when the test was recorded.';
    else if (toIsoOrNull(v.recordedAt) === null) errors.recordedAt = 'Enter a valid date and time.';
  }
  return errors;
}

/** Same HTTP-status mapping as the original dashboard (including the "(HTTP n)" suffix). */
function describeError(error: unknown): { message: string; unauthorized: boolean } {
  if (error instanceof ApiError) {
    const fallback =
      error.status === 401
        ? 'Your sign-in session has expired. Please sign in again.'
        : error.status === 403
          ? 'The server denied this action. Check your clinical role and unlock the patient vault again.'
          : error.status === 400
            ? 'The server rejected the entry. Check the required fields and encounter date.'
            : error.status === 404
              ? 'The patient or doctor profile could not be found.'
              : 'The entry could not be saved. Please try again.';
    const detail = error.message && !error.message.startsWith('Request failed with status') ? error.message : fallback;
    return { message: `${detail} (HTTP ${error.status})`, unauthorized: error.status === 401 };
  }
  return { message: 'The server could not be reached or the entry could not be prepared. Please try again.', unauthorized: false };
}

type Props = {
  kind: RecordKind;
  patientId: string;
  patientName: string;
  /** Called once the dialog has finished closing (so the parent can unmount it). */
  onClosed: () => void;
  onSaved: (saved: SavedRecord) => void;
  /** 401 while saving: offer a way back to sign-in. */
  onSignInAgain: () => void;
};

/**
 * Add-record dialog. Keeps the original field set, request shapes and error mapping, and adds:
 * inline validation (no native "required" bubbles), a dirty-form guard, a double-submit guard, an
 * ignore-late-response guard, comma decimals, and the patient's name in the header so the doctor
 * always knows which vault they are writing into. Mount it with a fresh `key` per open.
 */
export function AddRecordDialog({ kind, patientId, patientName, onClosed, onSaved, onSignInAgain }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState<Values>(() => initialValues(kind));
  const initial = useRef<Values>(values);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; unauthorized: boolean } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const alive = useRef(true);
  const busy = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const errors = useMemo(() => validate(kind, values), [kind, values]);
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial.current), [values]);
  const shown = (name: string) => (submitted || touched[name] ? errors[name] ?? null : null);

  const set = (name: string) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (serverError) setServerError(null);
  };
  const blur = (name: string) => () => setTouched((current) => ({ ...current, [name]: true }));

  const finishClose = () => {
    setOpen(false);
    closeTimer.current = setTimeout(onClosed, Motion.fast + 40);
  };

  // Escape / backdrop / Cancel / ✕ all land here: an untouched form closes at once, a dirty one asks first.
  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else finishClose();
  };

  const submit = async () => {
    if (busy.current || saving) return;
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER[kind].find((name) => errors[name]);
    if (firstInvalid) {
      document.getElementById(`record-${firstInvalid}`)?.focus();
      return;
    }

    busy.current = true;
    setSaving(true);
    setServerError(null);
    try {
      let saved: SavedRecord;
      if (kind === 'encounter') {
        const body: Schemas['CreateEncounterRequest'] = {
          patientId,
          diagnosis: values.diagnosis.trim(),
          clinicalNotes: values.clinicalNotes.trim(),
          encounterDate: values.encounterDate,
        };
        const created = await apiClient<Schemas['ClinicalEncounterResponse']>('/api/v1/doctor/encounters', { method: 'POST', body });
        saved = {
          kind,
          record: {
            id: created.id,
            doctorId: created.doctorId,
            doctorName: created.doctorName,
            doctorSpecialty: created.doctorSpecialty,
            encounterDate: created.encounterDate,
            diagnosis: created.diagnosis,
            clinicalNotes: created.clinicalNotes,
            createdAt: created.createdAt,
          },
        };
      } else if (kind === 'prescription') {
        const body: Schemas['CreatePrescriptionRequest'] = {
          patientId,
          medicationName: values.medicationName.trim(),
          dosage: values.dosage.trim(),
          instructions: values.instructions.trim(),
          expiresAt: toIsoOrNull(values.expiresAt) ?? '',
        };
        saved = { kind, record: await apiClient<Schemas['PrescriptionResponse']>('/api/v1/doctor/prescriptions', { method: 'POST', body }) };
      } else {
        const body: Schemas['CreateLabTestResultRequest'] = {
          patientId,
          testName: values.testName.trim(),
          numericValue: parseDecimal(values.numericValue) ?? NaN,
          unit: values.unit.trim(),
          recordedAt: toIsoOrNull(values.recordedAt) ?? '',
        };
        saved = { kind, record: await apiClient<Schemas['LabTestResultResponse']>('/api/v1/doctor/test-results', { method: 'POST', body }) };
      }
      // A response that arrives after the doctor navigated away must not touch the (now closed) UI.
      if (!alive.current) return;
      onSaved(saved);
      finishClose();
    } catch (error) {
      if (!alive.current) return;
      setServerError(describeError(error));
    } finally {
      busy.current = false;
      if (alive.current) setSaving(false);
    }
  };

  const meta = TITLES[kind];
  const rxPast = kind === 'prescription' && values.expiresAt && !errors.expiresAt && Date.parse(values.expiresAt) <= Date.now();

  const field = (name: string) => ({ id: `record-${name}`, error: shown(name), onBlur: blur(name) });

  return (
    <>
      <Dialog
        visible={open}
        icon={meta.icon}
        title={meta.title}
        description={`Saving to ${patientName}’s vault`}
        size="md"
        busy={saving}
        initialFocus={`#record-${FIELD_ORDER[kind][0]}`}
        onRequestClose={requestClose}
        footer={
          <>
            <Button label="Cancel" variant="ghost" portal size="compact" disabled={saving} onPress={requestClose} />
            <Button label="Save record" icon="checkmark" portal size="compact" loading={saving} onPress={submit} />
          </>
        }
      >
        <div
          // Plain <div>, not <form>: Enter inside a single-line field saves, Enter in the notes field adds a line.
          onKeyDown={(event) => {
            const target = event.target as HTMLElement;
            if (event.key === 'Enter' && !event.shiftKey && target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'button') {
              event.preventDefault();
              void submit();
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: Space[4] }}
        >
          {kind === 'encounter' ? (
            <>
              <TextField label="Diagnosis" value={values.diagnosis} onChangeText={set('diagnosis')} maxLength={SHORT_MAX} autoComplete="off" {...field('diagnosis')} />
              <TextArea
                label="Clinical notes"
                help="Visible to the patient and to other clinicians they authorize."
                value={values.clinicalNotes}
                onChangeText={set('clinicalNotes')}
                maxLength={NOTES_MAX}
                showCounter
                {...field('clinicalNotes')}
              />
              <DateField label="Encounter date" kind="date" value={values.encounterDate} onValueChange={set('encounterDate')} {...field('encounterDate')} />
            </>
          ) : kind === 'prescription' ? (
            <>
              <TextField label="Medication and strength" placeholder="e.g. Amoxicillin 500 mg" value={values.medicationName} onChangeText={set('medicationName')} maxLength={SHORT_MAX} autoComplete="off" {...field('medicationName')} />
              <TextField label="Dosage" placeholder="e.g. 1 capsule, three times daily" value={values.dosage} onChangeText={set('dosage')} maxLength={SHORT_MAX} autoComplete="off" {...field('dosage')} />
              <TextArea label="Instructions" help="Directions for the patient and the dispensing pharmacy." minRows={3} value={values.instructions} onChangeText={set('instructions')} maxLength={NOTES_MAX} showCounter {...field('instructions')} />
              <DateField
                label="Valid until"
                kind="datetime-local"
                help={rxPast ? undefined : 'No default: choose how long this prescription stays valid.'}
                value={values.expiresAt}
                onValueChange={set('expiresAt')}
                {...field('expiresAt')}
              />
              {rxPast ? (
                <InlineAlert tone="warning">This date is in the past, so the prescription would already be expired.</InlineAlert>
              ) : null}
            </>
          ) : (
            <>
              <TextField label="Test name" placeholder="e.g. Fasting blood glucose" value={values.testName} onChangeText={set('testName')} maxLength={SHORT_MAX} autoComplete="off" {...field('testName')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space[4] }}>
                <View style={{ flex: 1.2, minWidth: 160 }}>
                  <TextField label="Result" inputMode="decimal" placeholder="95.5" value={values.numericValue} onChangeText={set('numericValue')} autoComplete="off" {...field('numericValue')} />
                </View>
                <View style={{ flex: 1, minWidth: 140 }}>
                  <TextField label="Unit" placeholder="mg/dL" value={values.unit} onChangeText={set('unit')} maxLength={32} autoComplete="off" {...field('unit')} />
                </View>
              </View>
              <DateField label="Recorded at" kind="datetime-local" value={values.recordedAt} onValueChange={set('recordedAt')} {...field('recordedAt')} />
            </>
          )}

          {serverError ? (
            <InlineAlert tone="error" action={serverError.unauthorized ? { label: 'Sign in again', onPress: onSignInAgain } : undefined}>
              {serverError.message}
            </InlineAlert>
          ) : null}
          <Text style={{ fontFamily: Fonts.sans.regular, fontSize: 13, lineHeight: 18, color: theme.textMuted }}>
            All fields are required. This adds a new {meta.noun} to the patient’s vault.
          </Text>
        </div>
      </Dialog>

      <Dialog
        visible={confirmDiscard}
        role="alertdialog"
        size="sm"
        tone="danger"
        icon="trash-outline"
        title="Discard this entry?"
        description="What you typed hasn’t been saved and will be lost."
        initialFocus="#discard-keep"
        onRequestClose={() => setConfirmDiscard(false)}
        footer={
          <>
            <Button id="discard-keep" label="Keep editing" variant="ghost" portal size="compact" onPress={() => setConfirmDiscard(false)} />
            <Button
              label="Discard"
              variant="danger"
              portal
              size="compact"
              onPress={() => {
                setConfirmDiscard(false);
                finishClose();
              }}
            />
          </>
        }
      />
    </>
  );
}
