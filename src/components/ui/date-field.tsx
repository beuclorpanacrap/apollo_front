import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QuickOption = { label: string; days: number };

type DateFieldProps = {
  value?: string; // ISO yyyy-mm-dd
  onChange: (value: string | undefined) => void;
  quickOptions?: QuickOption[];
};

const DEFAULT_QUICK: QuickOption[] = [
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
];

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplay(iso?: string): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (!Number.isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  const fallback = new Date(iso);
  if (Number.isNaN(fallback.getTime())) return iso;
  return fallback.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DateField({ value, onChange, quickOptions = DEFAULT_QUICK }: DateFieldProps) {
  const theme = useTheme();
  const [manualOpen, setManualOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const applyOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    onChange(toIsoDate(d));
    setManualOpen(false);
  };

  const commitManual = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setManualOpen(false);
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      const parsed = new Date(y, m - 1, d);
      if (!Number.isNaN(parsed.getTime())) {
        onChange(toIsoDate(parsed));
      }
    } else {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        onChange(toIsoDate(parsed));
      }
    }
    setManualOpen(false);
  };

  return (
    <View>
      <View style={styles.chipRow}>
        {quickOptions.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => applyOffset(opt.days)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, { color: theme.textSecondary }]}>{opt.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setDraft(value ?? '');
            setManualOpen((v) => !v);
          }}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: theme.pillGreenBg, borderColor: theme.tint },
            pressed && styles.chipPressed,
          ]}
        >
          <Ionicons name="calendar-outline" size={13} color={theme.tintStrong} />
          <Text style={[styles.chipText, { color: theme.tintStrong }]}>Custom date</Text>
        </Pressable>
      </View>

      {manualOpen && (
        <View style={styles.manualRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            onSubmitEditing={commitManual}
            returnKeyType="done"
          />
          <Pressable
            onPress={commitManual}
            style={[styles.confirmBtn, { backgroundColor: theme.tintStrong }]}
          >
            <Ionicons name="checkmark" size={18} color={theme.onTint} />
          </Pressable>
        </View>
      )}

      {value ? (
        <View style={styles.selectedRow}>
          <Ionicons name="calendar" size={14} color={theme.tintStrong} />
          <Text style={[styles.selectedText, { color: theme.text }]}>{formatDisplay(value)}</Text>
          <Pressable onPress={() => onChange(undefined)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear date">
            <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  manualRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.sans.medium,
  },
  confirmBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two },
  selectedText: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
});
