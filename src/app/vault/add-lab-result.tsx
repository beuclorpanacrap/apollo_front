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

export default function AddLabResultScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { getLocalLabResultById, addLabResult, editLabResult } = useVault();
  const isEditing = !!editId;

  const [mode, setMode] = useState<'structured' | 'freeform'>('structured');
  const [testName, setTestName] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [unit, setUnit] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [freeformResult, setFreeformResult] = useState('');
  const [dateAdded, setDateAdded] = useState<string>(todayIso());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    const existing = getLocalLabResultById(editId);
    if (!existing) return;
    setMode(existing.mode);
    setTestName(existing.testName);
    setNumericValue(existing.numericValue != null ? String(existing.numericValue) : '');
    setUnit(existing.unit ?? '');
    setReferenceRange(existing.referenceRange ?? '');
    setFreeformResult(existing.freeformResult ?? '');
    setDateAdded(existing.dateAdded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const canSave = testName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const draft = {
      mode,
      testName: testName.trim(),
      numericValue: mode === 'structured' && numericValue.trim() ? Number(numericValue) : undefined,
      unit: mode === 'structured' ? unit.trim() || undefined : undefined,
      referenceRange: mode === 'structured' ? referenceRange.trim() || undefined : undefined,
      freeformResult: mode === 'freeform' ? freeformResult.trim() || undefined : undefined,
      dateAdded,
    };
    try {
      if (isEditing && editId) {
        await editLabResult(editId, draft);
      } else {
        await addLabResult(draft);
      }
      router.back();
    } catch (err) {
      console.warn('[add-lab-result] save failed:', err);
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
        <Text style={styles.headerTitle}>{isEditing ? 'Edit result' : 'Add test result'}</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heroField}>
            <Text style={styles.heroLabel}>Test name</Text>
            <TextInput
              placeholder="e.g. Hemoglobin A1c"
              placeholderTextColor={theme.textTertiary}
              value={testName}
              onChangeText={setTestName}
              style={[styles.heroInput, { borderBottomColor: theme.tintStrong }]}
              autoFocus={!isEditing}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Result type</Text>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setMode('structured')}
                style={[styles.modeCard, mode === 'structured' && { backgroundColor: theme.tintStrong, borderColor: theme.tintStrong }]}
              >
                <Ionicons name="grid-outline" size={22} color={mode === 'structured' ? '#FFFFFF' : theme.tintStrong} />
                <Text style={[styles.modeCardTitle, mode === 'structured' && styles.modeCardTitleActive]}>Structured</Text>
                <Text style={[styles.modeCardHint, mode === 'structured' && styles.modeCardHintActive]}>
                  Value + unit + range
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('freeform')}
                style={[styles.modeCard, mode === 'freeform' && { backgroundColor: theme.tintStrong, borderColor: theme.tintStrong }]}
              >
                <Ionicons name="create-outline" size={22} color={mode === 'freeform' ? '#FFFFFF' : theme.tintStrong} />
                <Text style={[styles.modeCardTitle, mode === 'freeform' && styles.modeCardTitleActive]}>Freeform</Text>
                <Text style={[styles.modeCardHint, mode === 'freeform' && styles.modeCardHintActive]}>
                  Just describe it
                </Text>
              </Pressable>
            </View>
          </View>

          {mode === 'structured' ? (
            <>
              <View style={styles.fieldPair}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Value</Text>
                  <TextInput
                    placeholder="e.g. 5.7"
                    placeholderTextColor={theme.textTertiary}
                    value={numericValue}
                    onChangeText={setNumericValue}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    placeholder="e.g. %"
                    placeholderTextColor={theme.textTertiary}
                    value={unit}
                    onChangeText={setUnit}
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Reference range (optional)</Text>
                <TextInput
                  placeholder="e.g. 4.0–5.6"
                  placeholderTextColor={theme.textTertiary}
                  value={referenceRange}
                  onChangeText={setReferenceRange}
                  style={styles.input}
                />
              </View>
            </>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Result</Text>
              <TextInput
                placeholder="Describe the result…"
                placeholderTextColor={theme.textTertiary}
                value={freeformResult}
                onChangeText={setFreeformResult}
                style={[styles.input, styles.freeformInput]}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

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
            label={isEditing ? 'Save changes' : 'Add result'}
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
  freeformInput: { minHeight: 90 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.backgroundElement,
  },
  modeCardTitle: { fontSize: 14, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text, marginTop: 2 },
  modeCardTitleActive: { color: '#FFFFFF' },
  modeCardHint: { fontSize: 11, fontFamily: Fonts.sans.regular, color: theme.textTertiary },
  modeCardHintActive: { color: 'rgba(255,255,255,0.85)' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
});
