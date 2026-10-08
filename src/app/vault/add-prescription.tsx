import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';

const theme = Colors.light;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddPrescriptionScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { getLocalPrescriptionById, addPrescription, editPrescription } = useVault();
  const isEditing = !!editId;

  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dateAdded, setDateAdded] = useState<string>(todayIso());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    const existing = getLocalPrescriptionById(editId);
    if (!existing) return;
    setMedicationName(existing.medicationName);
    setDosage(existing.dosage ?? '');
    setFrequency(existing.frequency ?? '');
    setInstructions(existing.instructions ?? '');
    setDateAdded(existing.dateAdded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const canSave = medicationName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const draft = {
      medicationName: medicationName.trim(),
      dosage: dosage.trim() || undefined,
      frequency: frequency.trim() || undefined,
      instructions: instructions.trim() || undefined,
      dateAdded,
    };
    try {
      if (isEditing && editId) {
        await editPrescription(editId, draft);
      } else {
        await addPrescription(draft);
      }
      router.back();
    } catch (err) {
      console.warn('[add-prescription] save failed:', err);
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
        <Text style={styles.headerTitle}>{isEditing ? 'Edit prescription' : 'Add prescription'}</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heroField}>
            <Text style={styles.heroLabel}>Medication name</Text>
            <TextInput
              placeholder="e.g. Amoxicillin"
              placeholderTextColor={theme.textTertiary}
              value={medicationName}
              onChangeText={setMedicationName}
              style={[styles.heroInput, { borderBottomColor: theme.tintStrong }]}
              autoFocus={!isEditing}
            />
          </View>

          <View style={styles.fieldPair}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Dosage</Text>
              <TextInput
                placeholder="e.g. 500mg"
                placeholderTextColor={theme.textTertiary}
                value={dosage}
                onChangeText={setDosage}
                style={styles.input}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Frequency</Text>
              <TextInput
                placeholder="e.g. 2x daily"
                placeholderTextColor={theme.textTertiary}
                value={frequency}
                onChangeText={setFrequency}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Instructions (optional)</Text>
            <TextInput
              placeholder="e.g. Take with food"
              placeholderTextColor={theme.textTertiary}
              value={instructions}
              onChangeText={setInstructions}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <DateField
              value={dateAdded}
              onChange={(v) => setDateAdded(v ?? todayIso())}
              quickOptions={[
                { label: 'Today', days: 0 },
                { label: 'Yesterday', days: -1 },
              ]}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={isEditing ? 'Save changes' : 'Add prescription'}
            onPress={handleSave}
            disabled={!canSave || isSaving}
            loading={isSaving}
            fullWidth
          />
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
  fieldPair: { flexDirection: 'row', gap: Spacing.three },
  label: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text, marginBottom: 8 },
  heroField: { marginBottom: Spacing.five },
  heroLabel: { fontSize: 13, fontFamily: Fonts.sans.medium, fontWeight: '500', color: theme.textSecondary, marginBottom: 6 },
  heroInput: {
    fontSize: 24,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    color: theme.text,
    paddingVertical: 8,
    borderBottomWidth: 2.5,
  },
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
