import { useState, type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '../constants/theme';
import {
  formatRange,
  measurementNameKey,
  measurementUnitKey,
  pickRange,
  printedReferenceKey,
  type TemplateEvaluation,
} from './evaluate';
import type {
  ChoiceField,
  DraftValues,
  Flag,
  LabTemplate,
  MeasurementField,
  NumberField,
  PatientContext,
  TemplateField,
  TextField,
} from './types';
import { Chip, FlagPill, font, SectionCard, useLabTheme } from './LabUI';

interface Props {
  template: LabTemplate;
  patient: PatientContext;
  values: DraftValues;
  onChange: (values: DraftValues) => void;
  /** Output of evaluateTemplate(). The parent computes it so it can reuse it when saving. */
  evaluation: TemplateEvaluation;
  /** Cards shown ahead of the sections, in the same stack (the date). */
  leading?: ReactNode;
}

/** Renders every section and field of the template. It knows nothing about a specific test. */
export function LabResultForm({ template, patient, values, onChange, evaluation, leading }: Props) {
  const set = (key: string, value: string) => onChange({ ...values, [key]: value });

  return (
    <View testID="lab-form" style={{ gap: 19 }}>
      {leading}
      {template.sections.map((section) => (
        <SectionCard key={section.id} title={section.title}>
          {section.fields.map((field) => {
            const result = evaluation.byKey[field.key];
            const common = {
              value: values[field.key] ?? '',
              onChange: (v: string) => set(field.key, v),
              flag: result?.flag,
              error: result?.error,
            };
            switch (field.type) {
              case 'number':
                return (
                  <NumberRow
                    key={field.key}
                    field={field}
                    patient={patient}
                    printedReference={values[printedReferenceKey(field.key)] ?? ''}
                    onPrintedReferenceChange={(v) => set(printedReferenceKey(field.key), v)}
                    {...common}
                  />
                );
              case 'choice':
                return <ChoiceRow key={field.key} field={field} {...common} />;
              case 'text':
                return <TextRow key={field.key} field={field} {...common} />;
              case 'measurement':
                return (
                  <MeasurementRow
                    key={field.key}
                    field={field}
                    name={values[measurementNameKey(field.key)] ?? ''}
                    onNameChange={(v) => set(measurementNameKey(field.key), v)}
                    unit={values[measurementUnitKey(field.key)] ?? ''}
                    onUnitChange={(v) => set(measurementUnitKey(field.key), v)}
                    reference={values[printedReferenceKey(field.key)] ?? ''}
                    onReferenceChange={(v) => set(printedReferenceKey(field.key), v)}
                    {...common}
                  />
                );
            }
          })}
        </SectionCard>
      ))}
    </View>
  );
}

// ─── Rows ────────────────────────────────────────────────────────────────────

interface RowProps<F> {
  field: F;
  value: string;
  onChange: (value: string) => void;
  flag?: Flag;
  error?: string;
}

function NumberRow({
  field,
  patient,
  value,
  onChange,
  flag,
  error,
  printedReference,
  onPrintedReferenceChange,
}: RowProps<NumberField> & {
  patient: PatientContext;
  printedReference: string;
  onPrintedReferenceChange: (value: string) => void;
}) {
  const c = useLabTheme();
  const range = pickRange(field, patient);
  const reference = formatRange(range, field.decimals);

  return (
    <View style={{ gap: 10 }}>
      <RowHeader label={field.label} required={field.required} flag={flag} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <LabInput
          style={{ flex: 1 }}
          value={value}
          onChangeText={onChange}
          // The decimal pad has no "<" key.
          keyboardType={field.censored ? 'default' : 'decimal-pad'}
          placeholder={field.censored ? '0 or <0.5' : '0'}
          hasError={!!error}
          accessibilityLabel={field.label}
        />
        <Text style={[font('medium'), { color: c.textSecondary, fontSize: 18, minWidth: 77 }]}>
          {field.unit}
        </Text>
      </View>
      <Text style={[font('regular'), { color: error ? c.danger : c.textSecondary, fontSize: 14 }]}>
        {error ?? (reference ? `Reference: ${reference} ${field.unit}`.trim() : ' ')}
      </Text>
      {range ? null : (
        // No standard range applies to this patient (or the lab's analyzer sets it): take the printed one.
        <LabInput
          value={printedReference}
          onChangeText={onPrintedReferenceChange}
          placeholder="Lab's reference as printed, e.g. 3.5–12.5"
          accessibilityLabel={`${field.label} reference`}
        />
      )}
    </View>
  );
}

function ChoiceRow({ field, value, onChange, flag, error }: RowProps<ChoiceField>) {
  const c = useLabTheme();
  return (
    <View style={{ gap: 10 }}>
      <RowHeader
        label={field.label}
        required={field.required}
        flag={flag === 'abnormal' ? flag : undefined}
      />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={field.label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {field.options.map((option) => {
          const selected = value === option.value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              selected={selected}
              onPress={() => onChange(selected ? '' : option.value)}
            />
          );
        })}
      </View>
      {error ? (
        <Text style={[font('regular'), { color: c.danger, fontSize: 14 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

function TextRow({ field, value, onChange, error }: RowProps<TextField>) {
  const c = useLabTheme();
  return (
    <View style={{ gap: 10 }}>
      <RowHeader label={field.label} required={field.required} />
      <LabInput
        value={value}
        onChangeText={onChange}
        multiline={field.multiline}
        hasError={!!error}
        accessibilityLabel={field.label}
        style={field.multiline ? { minHeight: 115, textAlignVertical: 'top' } : undefined}
      />
      {error ? (
        <Text style={[font('regular'), { color: c.danger, fontSize: 14 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

/** A test with no template: name, result, unit and the range the lab printed. */
function MeasurementRow({
  field,
  value,
  onChange,
  flag,
  error,
  name,
  onNameChange,
  unit,
  onUnitChange,
  reference,
  onReferenceChange,
}: RowProps<MeasurementField> & {
  name: string;
  onNameChange: (value: string) => void;
  unit: string;
  onUnitChange: (value: string) => void;
  reference: string;
  onReferenceChange: (value: string) => void;
}) {
  const c = useLabTheme();
  return (
    <View style={{ gap: 10 }}>
      <RowHeader label={field.label} required={field.required} flag={flag} />
      <LabInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Test name, e.g. Interleukin 4"
        hasError={error === 'Enter the test name'}
        accessibilityLabel="Test name"
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <LabInput
          style={{ flex: 2 }}
          value={value}
          onChangeText={onChange}
          placeholder="Result, e.g. 5.4, <2.6 or Positive"
          hasError={!!error && error !== 'Enter the test name'}
          accessibilityLabel="Result"
        />
        <LabInput
          style={{ flex: 1 }}
          value={unit}
          onChangeText={onUnitChange}
          placeholder="Unit"
          accessibilityLabel="Unit"
        />
      </View>
      <LabInput
        value={reference}
        onChangeText={onReferenceChange}
        placeholder="Reference as printed, e.g. <13.1 (optional)"
        accessibilityLabel="Reference range"
      />
      <Text style={[font('regular'), { color: error ? c.danger : c.textSecondary, fontSize: 14 }]}>
        {error ?? ' '}
      </Text>
    </View>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function RowHeader({ label, required, flag }: { label: string; required?: boolean; flag?: Flag }) {
  const c = useLabTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}>
      <Text style={[font('semiBold'), { color: c.text, fontSize: 18, flexShrink: 1 }]}>
        {label}
        {required ? <Text style={{ color: c.danger }}> *</Text> : null}
      </Text>
      {flag ? <FlagPill flag={flag} /> : null}
    </View>
  );
}

function LabInput({
  hasError,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & { hasError?: boolean }) {
  const c = useLabTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.textTertiary}
      selectionColor={c.tint}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          backgroundColor: c.surfaceMuted,
          borderColor: hasError ? c.danger : focused ? c.tint : c.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 19,
          paddingVertical: 14,
          color: c.text,
          fontSize: 19,
          ...font('medium'),
        },
        style,
      ]}
    />
  );
}
