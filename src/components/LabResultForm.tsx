import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '../constants/theme';
import { formatRange, pickRange, type TemplateEvaluation } from './evaluate';
import type {
  ChoiceField,
  DraftValues,
  Flag,
  LabTemplate,
  NumberField,
  PatientContext,
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
}

/** Renders every section and field of the template. It knows nothing about a specific test. */
export function LabResultForm({ template, patient, values, onChange, evaluation }: Props) {
  const set = (key: string, value: string) => onChange({ ...values, [key]: value });

  return (
    <View style={{ gap: Spacing.three }}>
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
                return <NumberRow key={field.key} field={field} patient={patient} {...common} />;
              case 'choice':
                return <ChoiceRow key={field.key} field={field} {...common} />;
              case 'text':
                return <TextRow key={field.key} field={field} {...common} />;
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
}: RowProps<NumberField> & { patient: PatientContext }) {
  const c = useLabTheme();
  const reference = formatRange(pickRange(field, patient), field.decimals);

  return (
    <View style={{ gap: Spacing.two }}>
      <RowHeader label={field.label} required={field.required} flag={flag} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <LabInput
          style={{ flex: 1 }}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          hasError={!!error}
          accessibilityLabel={field.label}
        />
        <Text style={[font('medium'), { color: c.textSecondary, fontSize: 15, minWidth: 64 }]}>
          {field.unit}
        </Text>
      </View>
      <Text style={[font('regular'), { color: error ? c.danger : c.textSecondary, fontSize: 12 }]}>
        {error ?? (reference ? `Reference: ${reference} ${field.unit}`.trim() : ' ')}
      </Text>
    </View>
  );
}

function ChoiceRow({ field, value, onChange, flag, error }: RowProps<ChoiceField>) {
  const c = useLabTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <RowHeader
        label={field.label}
        required={field.required}
        flag={flag === 'abnormal' ? flag : undefined}
      />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={field.label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
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
        <Text style={[font('regular'), { color: c.danger, fontSize: 12 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

function TextRow({ field, value, onChange, error }: RowProps<TextField>) {
  const c = useLabTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <RowHeader label={field.label} required={field.required} />
      <LabInput
        value={value}
        onChangeText={onChange}
        multiline={field.multiline}
        hasError={!!error}
        accessibilityLabel={field.label}
        style={field.multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
      />
      {error ? (
        <Text style={[font('regular'), { color: c.danger, fontSize: 12 }]}>{error}</Text>
      ) : null}
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
        gap: Spacing.two,
      }}>
      <Text style={[font('semiBold'), { color: c.text, fontSize: 15, flexShrink: 1 }]}>
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
          borderRadius: 12,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two + Spacing.one,
          color: c.text,
          fontSize: 16,
          ...font('medium'),
        },
        style,
      ]}
    />
  );
}
