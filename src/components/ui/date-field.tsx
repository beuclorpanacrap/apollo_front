import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedDatePicker } from '@/components/themed-date-picker';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateFieldProps = {
  value?: string; // Local calendar date, YYYY-MM-DD.
  onChange: (value: string | undefined) => void;
  quickOptions?: { label: string; days: number }[];
};

export function DateField({ value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Change date, ${value}` : 'Select date'}
        onPress={() => setOpen(true)}
        style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
      >
        <Text style={[styles.text, { color: value ? theme.text : theme.textTertiary }]}>{value || 'Select date'}</Text>
        <Ionicons name="calendar-outline" size={20} color={theme.textTertiary} />
      </Pressable>
      <ThemedDatePicker
        visible={open}
        value={value ? new Date(`${value}T12:00:00`) : null}
        onClose={() => setOpen(false)}
        onChange={date => onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)}
      />
      {value && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear date" onPress={() => onChange(undefined)}>
          <Text style={{ color: theme.textSecondary, marginTop: 8 }}>Clear date</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 14 },
  text: { fontSize: 14, fontFamily: Fonts.sans.medium },
});
