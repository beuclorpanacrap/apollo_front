import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Badge, IconBubble } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/ui/detail-row';
import { BrandColors, Colors, Fonts, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { confirmAsync } from '@/utils/confirm';
import { formatDateLabel } from '@/utils/vault-display';

const theme = Colors.light;

export default function ViewLabResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { localLabResults, testResults, removeLabResult } = useVault();

  const local = useMemo(() => localLabResults.find((l) => l.id === id), [localLabResults, id]);
  const remote = useMemo(() => (!local ? testResults.find((l) => l.id === id) : undefined), [local, testResults, id]);

  const record = local
    ? {
        name: local.testName,
        numericValue: local.mode === 'structured' ? local.numericValue : undefined,
        unit: local.mode === 'structured' ? local.unit : undefined,
        referenceRange: local.mode === 'structured' ? local.referenceRange : undefined,
        freeformResult: local.mode === 'freeform' ? local.freeformResult : undefined,
        date: local.dateAdded,
        doctorName: undefined as string | undefined,
      }
    : remote
      ? {
          name: remote.testName,
          numericValue: remote.numericValue,
          unit: remote.unit,
          referenceRange: undefined as string | undefined,
          freeformResult: undefined as string | undefined,
          date: remote.recordedAt,
          doctorName: remote.doctorName,
        }
      : undefined;

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.notFoundBody}>
          <Ionicons name="help-circle-outline" size={32} color={theme.textTertiary} />
          <Text style={styles.notFoundText}>This record couldn't be found — it may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasStat = record.numericValue != null;
  const handleEdit = () => router.push({ pathname: '/vault/add-lab-result', params: { editId: id } });
  const handleDelete = async () => {
    const confirmed = await confirmAsync('Delete this result?', "This can't be undone.");
    if (!confirmed) return;
    await removeLabResult(id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: theme.pillClayBg }]}>
          <IconBubble icon="flask" bg={BrandColors.clay} fg="#FFFFFF" size={64} />
          <Text style={styles.heroTitle}>{record.name}</Text>

          {hasStat ? (
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{record.numericValue}</Text>
              {record.unit ? <Text style={styles.statUnit}>{record.unit}</Text> : null}
            </View>
          ) : null}
          {hasStat && record.referenceRange ? (
            <Text style={styles.statRange}>Reference: {record.referenceRange}</Text>
          ) : null}

          <Badge
            label={local ? 'Logged by you' : 'Doctor verified'}
            bg={local ? theme.pillPeachBg : theme.pillGreenBg}
            fg={local ? theme.pillPeachText : theme.pillGreenText}
            icon={local ? 'person' : 'shield-checkmark'}
          />
        </View>

        <View style={styles.content}>
          {record.freeformResult ? (
            <DetailRow icon="document-text-outline" label="Result">
              {record.freeformResult}
            </DetailRow>
          ) : null}
          {record.doctorName ? (
            <DetailRow icon="person-circle-outline" label="Doctor">
              {record.doctorName}
            </DetailRow>
          ) : null}
          <DetailRow icon="calendar-outline" label="Date">
            {formatDateLabel(record.date)}
          </DetailRow>

          {local ? (
            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <Button label="Edit" variant="secondary" icon="create-outline" onPress={handleEdit} fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Delete" variant="danger" icon="trash-outline" onPress={handleDelete} fullWidth />
              </View>
            </View>
          ) : (
            <View style={styles.readOnlyNote}>
              <Ionicons name="shield-checkmark" size={16} color={theme.tintStrong} />
              <Text style={styles.readOnlyNoteText}>
                Added by your doctor. Doctor-authored records can't be edited or deleted.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 28, paddingHorizontal: 24, gap: 10 },
  heroTitle: { fontSize: 24, fontFamily: Fonts.display, fontWeight: '800', color: theme.text, textAlign: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 },
  statValue: { fontSize: 48, fontFamily: Fonts.sans.extraBold, fontWeight: '800', color: theme.text, lineHeight: 52 },
  statUnit: { fontSize: 18, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
  statRange: { fontSize: 12, fontFamily: Fonts.sans.medium, fontWeight: '500', color: theme.textTertiary, marginTop: -6 },
  content: { padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.four },
  readOnlyNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.pillGreenBg,
    borderRadius: 12,
    padding: 14,
    marginTop: Spacing.two,
  },
  readOnlyNoteText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.pillGreenText, lineHeight: 17 },
  notFoundBody: { padding: 32, alignItems: 'center', gap: 10 },
  notFoundText: { fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.textSecondary, textAlign: 'center' },
});
