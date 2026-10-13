import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { visionApi } from '@/api/vision.api';
import type { VisionPrescriptionResponse } from '@/api/vision.types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { DateField, TextArea, TextField } from '@/components/ui/form-field';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Fonts, Motion, Space } from '@/constants/theme';
import { useMinuteClock } from '@/hooks/use-minute-clock';
import { useTheme } from '@/hooks/use-theme';
import {
  VISION_EYES,
  VISION_FIELD_ORDER,
  VISION_PARTS,
  buildVisionRequest,
  emptyVisionValues,
  endOfLocalDay,
  fieldName,
  validateVisionForm,
  type VisionFormValues,
  type VisionPart,
} from '@/utils/vision';

const NOTES_MAX = 1000;

const PART_META: Record<VisionPart, { label: string; placeholder: string; suffix: string; help?: string; inputMode?: 'numeric' }> = {
  sphere: { label: 'Sphere', placeholder: '-2.50', suffix: 'D' },
  cylinder: { label: 'Cylinder', placeholder: '-0.75', suffix: 'D' },
  axis: { label: 'Axis', placeholder: '180', suffix: '°', inputMode: 'numeric' },
  add: { label: 'Add', placeholder: '+1.50', suffix: 'D' },
};

/** Same status-code mapping as the other record dialogs, with a hint for a server that has no such endpoint. */
function describeError(error: unknown): { message: string; unauthorized: boolean } {
  if (error instanceof ApiError) {
    const fallback =
      error.status === 401
        ? 'Your sign-in session has expired. Please sign in again.'
        : error.status === 403
          ? 'The server denied this action. Check your clinical role and unlock the patient vault again.'
          : error.status === 400
            ? 'The server rejected the entry. Check the values and try again.'
            : error.status === 404 || error.status === 405
              ? 'The patient could not be found, or this server does not support glasses prescriptions yet.'
              : 'The prescription could not be saved. Please try again.';
    const detail = error.message && !error.message.startsWith('Request failed with status') ? error.message : fallback;
    return { message: `${detail} (HTTP ${error.status})`, unauthorized: error.status === 401 };
  }
  return { message: 'The server could not be reached or the entry could not be prepared. Please try again.', unauthorized: false };
}

type Props = {
  patientId: string;
  patientName: string;
  /** Called once the dialog has finished closing (so the parent can unmount it). */
  onClosed: () => void;
  onSaved: (record: VisionPrescriptionResponse) => void;
  /** 401 while saving: offer a way back to sign-in. */
  onSignInAgain: () => void;
};

/**
 * Glasses prescription form: sphere, cylinder, axis and add for each eye, plus the pupillary distance.
 * Same behavior as the other add-record dialogs (inline validation, dirty-form guard, double-submit guard,
 * ignore-late-response guard). Mount it with a fresh `key` per open.
 */
export function AddVisionDialog({ patientId, patientName, onClosed, onSaved, onSignInAgain }: Props) {
  const theme = useTheme();
  const now = useMinuteClock();
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState<VisionFormValues>(emptyVisionValues);
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

  const errors = useMemo(() => validateVisionForm(values), [values]);
  const dirty = useMemo(() => VISION_FIELD_ORDER.some((name) => (values[name] ?? '').trim() !== ''), [values]);
  const shown = (name: string) => (submitted || touched[name] ? errors[name] ?? null : null);
  const expired = !errors.expiresAt && !!values.expiresAt && endOfLocalDay(values.expiresAt).getTime() < now.getTime();

  const set = (name: string) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (serverError) setServerError(null);
  };
  const blur = (name: string) => () => setTouched((current) => ({ ...current, [name]: true }));
  const field = (name: string) => ({ id: `vision-${name}`, error: shown(name), onBlur: blur(name) });

  const finishClose = () => {
    setOpen(false);
    closeTimer.current = setTimeout(onClosed, Motion.fast + 40);
  };

  // Escape / Cancel / ✕ all land here: an untouched form closes at once, a dirty one asks first.
  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else finishClose();
  };

  const submit = async () => {
    if (busy.current || saving) return;
    setSubmitted(true);
    const firstInvalid = VISION_FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) {
      if (typeof document !== 'undefined') {
        document.getElementById(`vision-${firstInvalid}`)?.focus();
      }
      return;
    }

    busy.current = true;
    setSaving(true);
    setServerError(null);
    try {
      const record = await visionApi.create(buildVisionRequest(patientId, values));
      // A response that arrives after the doctor navigated away must not touch the (now closed) UI.
      if (!alive.current) return;
      onSaved(record);
      finishClose();
    } catch (error) {
      if (!alive.current) return;
      setServerError(describeError(error));
    } finally {
      busy.current = false;
      if (alive.current) setSaving(false);
    }
  };

  const muted = { fontFamily: Fonts.sans.regular, fontSize: 13, lineHeight: 18, color: theme.textMuted } as const;

  return (
    <>
      <Dialog
        visible={open}
        icon="eye-outline"
        title="Add glasses prescription"
        description={`Saving to ${patientName}’s vault`}
        size="lg"
        busy={saving}
        initialFocus="#vision-rightSphere"
        onRequestClose={requestClose}
        footer={
          <>
            <Button label="Cancel" variant="ghost" portal size="compact" disabled={saving} onPress={requestClose} />
            <Button label="Save prescription" icon="checkmark" portal size="compact" loading={saving} onPress={submit} />
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
          style={{ display: 'flex', flexDirection: 'column', gap: Space[5] }}
        >
          {VISION_EYES.map((eye) => (
            <div key={eye.key} role="group" aria-label={`${eye.label} (${eye.abbr})`} style={{ display: 'flex', flexDirection: 'column', gap: Space[3] }}>
              <Text
                role="heading"
                aria-level={3}
                style={{ fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontSize: 15, lineHeight: 20, color: theme.text }}
              >
                {eye.label} <Text style={{ color: theme.textMuted, fontWeight: '500' }}>({eye.abbr})</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space[3] }}>
                {VISION_PARTS.map((part) => {
                  const meta = PART_META[part];
                  const name = fieldName(eye.key, part);
                  return (
                    <View key={part} style={{ flex: 1, minWidth: 130 }}>
                      <TextField
                        label={meta.label}
                        optional={part !== 'sphere'}
                        placeholder={meta.placeholder}
                        suffix={meta.suffix}
                        inputMode={meta.inputMode}
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={7}
                        value={values[name] ?? ''}
                        onChangeText={set(name)}
                        {...field(name)}
                      />
                    </View>
                  );
                })}
              </View>
            </div>
          ))}

          <Text style={muted}>
            Powers are in diopters, in steps of 0.25: write +0.50 or -2.25, and 0 for plano. The axis is needed whenever there is a cylinder. Leave an eye empty if it is not prescribed.
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space[4] }}>
            <View style={{ flex: 1, minWidth: 180 }}>
              <TextField
                label="Pupillary distance"
                optional
                placeholder="63"
                suffix="mm"
                autoComplete="off"
                inputMode="decimal"
                maxLength={5}
                value={values.pd ?? ''}
                onChangeText={set('pd')}
                {...field('pd')}
              />
            </View>
            <View style={{ flex: 1, minWidth: 180 }}>
              <DateField
                label="Valid until"
                optional
                kind="date"
                help={expired ? undefined : 'Leave empty if the prescription has no set validity.'}
                value={values.expiresAt ?? ''}
                onValueChange={set('expiresAt')}
                {...field('expiresAt')}
              />
            </View>
          </View>
          {expired ? <InlineAlert tone="warning">This date is in the past, so the prescription would already be expired.</InlineAlert> : null}

          <TextArea
            label="Notes"
            optional
            help="For the optician or the patient, for example lens type or wearing instructions."
            minRows={2}
            value={values.notes ?? ''}
            onChangeText={set('notes')}
            maxLength={NOTES_MAX}
            showCounter
            {...field('notes')}
          />

          {serverError ? (
            <InlineAlert tone="error" action={serverError.unauthorized ? { label: 'Sign in again', onPress: onSignInAgain } : undefined}>
              {serverError.message}
            </InlineAlert>
          ) : null}
          <Text style={muted}>This adds a new glasses prescription to the patient’s vault.</Text>
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
        initialFocus="#vision-discard-keep"
        onRequestClose={() => setConfirmDiscard(false)}
        footer={
          <>
            <Button id="vision-discard-keep" label="Keep editing" variant="ghost" portal size="compact" onPress={() => setConfirmDiscard(false)} />
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
