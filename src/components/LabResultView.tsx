import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '../constants/theme';
import { formatValue } from './evaluate';
import type { LabTemplate, ResultEntry, TemplateField } from './types';
import { FlagPill, flagColors, font, SectionCard, useLabTheme } from './LabUI';

interface Props {
  /** The template version the result was saved with (see getTemplate). */
  template: LabTemplate;
  entries: ResultEntry[];
  /** Set to false when the screen already shows the test name. */
  showTitle?: boolean;
}

/** Read-only report. Doctors and patients both use it, so the role-based UI can share one component. */
export function LabResultView({ template, entries, showTitle = true }: Props) {
  const c = useLabTheme();
  const byKey = new Map(entries.map((entry) => [entry.key, entry] as const));

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ gap: Spacing.one }}>
        {showTitle ? <Text style={[font('bold'), { color: c.text, fontSize: 22 }]}>{template.name}</Text> : null}
        <Text style={[font('regular'), { color: c.textSecondary, fontSize: 14 }]}>
          {template.specimen}
        </Text>
      </View>

      {template.sections.map((section) => {
        // Only show fields that actually have a saved value.
        const rows = section.fields.flatMap((field) => {
          const entry = byKey.get(field.key);
          return entry ? [{ field, entry }] : [];
        });
        if (rows.length === 0) return null;

        return (
          <SectionCard key={section.id} title={section.title}>
            {rows.map(({ field, entry }, i) => (
              <Row key={field.key} field={field} entry={entry} first={i === 0} />
            ))}
          </SectionCard>
        );
      })}
    </View>
  );
}

function Row({ field, entry, first }: { field: TemplateField; entry: ResultEntry; first: boolean }) {
  const c = useLabTheme();
  const divider = first
    ? {}
    : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: Spacing.three };

  if (field.type === 'text') {
    return (
      <View style={[{ gap: Spacing.one }, divider]}>
        <Text style={[font('semiBold'), { color: c.text, fontSize: 15 }]}>{field.label}</Text>
        <Text style={[font('regular'), { color: c.text, fontSize: 15, lineHeight: 22 }]}>
          {String(entry.value)}
        </Text>
      </View>
    );
  }

  // A report only calls out what is off; "normal" stays quiet.
  const shown = entry.flag !== undefined && entry.flag !== 'normal' ? entry.flag : undefined;

  return (
    <View
      style={[
        { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
        divider,
      ]}>
      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text style={[font('semiBold'), { color: c.text, fontSize: 15 }]}>{field.label}</Text>
        {entry.reference ? (
          <Text style={[font('regular'), { color: c.textSecondary, fontSize: 12 }]}>
            {`Reference: ${entry.reference} ${entry.unit ?? ''}`.trim()}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: Spacing.one }}>
        <Text style={[font('bold'), { color: shown ? flagColors(c, shown).fg : c.text, fontSize: 17 }]}>
          {formatValue(field, entry)}
          {entry.unit ? (
            <Text style={[font('regular'), { color: c.textSecondary, fontSize: 13 }]}>
              {` ${entry.unit}`}
            </Text>
          ) : null}
        </Text>
        {shown ? <FlagPill flag={shown} /> : null}
      </View>
    </View>
  );
}
