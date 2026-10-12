import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '../constants/theme';
import { formatValue } from './evaluate';
import type { LabTemplate, ResultEntry, TemplateField } from './types';
import { FlagPill, flagColors, font, Masonry, SectionCard, useLabTheme, type MasonryItem } from './LabUI';

interface Props {
  /** The template version the result was saved with (see getTemplate). */
  template: LabTemplate;
  entries: ResultEntry[];
  /** Set to false when the screen already shows the test name. */
  showTitle?: boolean;
  /** More cards for the same collage, e.g. who entered it and when. */
  extra?: MasonryItem[];
}

/** One card per section that has at least one saved value. Weighted by row count for the collage. */
export function labResultItems(template: LabTemplate, entries: ResultEntry[]): MasonryItem[] {
  const byKey = new Map(entries.map((entry) => [entry.key, entry] as const));

  return template.sections.flatMap((section) => {
    // Only show fields that actually have a saved value.
    const rows = section.fields.flatMap((field) => {
      const entry = byKey.get(field.key);
      return entry ? [{ field, entry }] : [];
    });
    if (rows.length === 0) return [];

    return [
      {
        key: section.id,
        weight: 1 + rows.length,
        node: (
          <SectionCard title={section.title}>
            {rows.map(({ field, entry }, i) => (
              <Row key={field.key} field={field} entry={entry} first={i === 0} />
            ))}
          </SectionCard>
        ),
      },
    ];
  });
}

/** Read-only report. Doctors and patients both use it, so the role-based UI can share one component. */
export function LabResultView({ template, entries, showTitle = true, extra = [] }: Props) {
  const c = useLabTheme();

  return (
    <View style={{ gap: 19 }}>
      <View style={{ gap: 5 }}>
        {showTitle ? <Text style={[font('bold'), { color: c.text, fontSize: 26 }]}>{template.name}</Text> : null}
        <Text style={[font('regular'), { color: c.textSecondary, fontSize: 17 }]}>
          {template.specimen}
        </Text>
      </View>

      <Masonry items={[...labResultItems(template, entries), ...extra]} />
    </View>
  );
}

function Row({ field, entry, first }: { field: TemplateField; entry: ResultEntry; first: boolean }) {
  const c = useLabTheme();
  const divider = first
    ? {}
    : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 19 };

  if (field.type === 'text') {
    return (
      <View style={[{ gap: 5 }, divider]}>
        <Text style={[font('semiBold'), { color: c.text, fontSize: 18 }]}>{field.label}</Text>
        <Text style={[font('regular'), { color: c.text, fontSize: 18, lineHeight: 26 }]}>
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
        { flexDirection: 'row', justifyContent: 'space-between', gap: 19 },
        divider,
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[font('semiBold'), { color: c.text, fontSize: 18 }]}>{entry.label ?? field.label}</Text>
        {entry.reference ? (
          <Text style={[font('regular'), { color: c.textSecondary, fontSize: 14 }]}>
            {`Reference: ${entry.reference} ${entry.unit ?? ''}`.trim()}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text style={[font('bold'), { color: shown ? flagColors(c, shown).fg : c.text, fontSize: 20 }]}>
          {formatValue(field, entry)}
          {entry.unit ? (
            <Text style={[font('regular'), { color: c.textSecondary, fontSize: 16 }]}>
              {` ${entry.unit}`}
            </Text>
          ) : null}
        </Text>
        {shown ? <FlagPill flag={shown} /> : null}
      </View>
    </View>
  );
}
