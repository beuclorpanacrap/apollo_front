import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import type { CreateHealthConditionRequest } from '@/api/vault.api';
import { BrandColors, Colors, Fonts, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';

const theme = Colors.light;

type ConditionType = CreateHealthConditionRequest['type'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const TYPE_OPTIONS: { value: ConditionType; label: string; color: string }[] = [
  { value: 'CHRONIC_CONDITION', label: 'Chronic condition', color: BrandColors.plum },
  { value: 'ALLERGY', label: 'Allergy', color: BrandColors.coral },
  { value: 'LIFESTYLE', label: 'Lifestyle', color: BrandColors.honey },
];

export default function AddConditionScreen() {
  const router = useRouter();
  const { addCondition } = useVault();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ConditionType>('CHRONIC_CONDITION');
  const [dateRecorded, setDateRecorded] = useState<string>(todayIso());
  const [isSaving, setIsSaving] = useState(false);

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await addCondition({ title: title.trim(), type, dateRecorded });
      router.back();
    } catch (err) {
      console.warn('[add-condition] save failed:', err);
      Alert.alert('Something went wrong', "Couldn't save this. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add condition</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[
                      styles.typeChip,
                      { borderColor: opt.color },
                      active && { backgroundColor: opt.color },
                    ]}
                  >
                    <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : opt.color }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.heroField}>
            <Text style={styles.heroLabel}>{type === 'ALLERGY' ? 'What are you allergic to?' : 'Name'}</Text>
            <TextInput
              placeholder={
                type === 'ALLERGY' ? 'e.g. Shellfish' : type === 'LIFESTYLE' ? 'e.g. Tobacco: Smoker' : 'e.g. Asthma'
              }
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
              style={[styles.heroInput, { borderBottomColor: TYPE_OPTIONS.find((o) => o.value === type)?.color }]}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <DateField
              value={dateRecorded}
              onChange={(v) => setDateRecorded(v ?? todayIso())}
              quickOptions={[{ label: 'Today', days: 0 }]}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Add condition" onPress={handleSave} disabled={!canSave || isSaving} loading={isSaving} fullWidth />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  content: { padding: 20, paddingBottom: 40, maxWidth: 600, alignSelf: 'center', width: '100%' },
  field: { marginBottom: Spacing.four },
  label: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text, marginBottom: 8 },
  heroField: { marginBottom: Spacing.five },
  heroLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans.medium,
    fontWeight: '500',
    color: theme.textSecondary,
    marginBottom: 6,
  },
  heroInput: {
    fontSize: 24,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    color: theme.text,
    paddingVertical: 8,
    borderBottomWidth: 2.5,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  typeChipText: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.sans.regular,
    color: theme.text,
    backgroundColor: theme.backgroundElement,
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
});
