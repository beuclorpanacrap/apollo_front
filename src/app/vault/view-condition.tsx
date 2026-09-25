import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Badge, IconBubble } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/ui/detail-row';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { confirmAsync, notifyAsync } from '@/utils/confirm';
import {
  accentForKind,
  formatConditionType,
  formatDateLabel,
  iconForKind,
  isConditionDeletable,
  pillColorsForKind,
  type VaultEntrySource,
} from '@/utils/vault-display';

const theme = Colors.light;

export default function ViewConditionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conditions, conditionStatuses, deleteConditionEntry, updateConditionStatus } = useVault();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const condition = useMemo(() => conditions.find((c) => c.id === id), [conditions, id]);

  if (!condition) {
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

  const source = (condition.sourceType as VaultEntrySource) ?? 'PATIENT_DECLARED';
  const conditionStatus = conditionStatuses[id] ?? 'ACTIVE';
  const deletable = isConditionDeletable(source);
  const accent = accentForKind('CONDITION', theme, condition.type);
  const icon = iconForKind('CONDITION', condition.type);
  const pillColors = pillColorsForKind('CONDITION', theme, condition.type);

  const handleDelete = async () => {
    const confirmed = await confirmAsync(
      'Delete this condition?',
      `This removes "${condition.title}" from your vault. This can't be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteConditionEntry(condition.id!);
      router.back();
    } catch {
      await notifyAsync('Something went wrong', "Couldn't remove this right now. Please try again.");
    }
  };

  const handleToggleStatus = async () => {
    setIsUpdatingStatus(true);
    try {
      await updateConditionStatus(id, conditionStatus === 'ACTIVE' ? 'RESOLVED' : 'ACTIVE');
    } catch {
      await notifyAsync('Something went wrong', "Couldn't update this condition's status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
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
        <View style={[styles.hero, { backgroundColor: pillColors.bg }]}>
          <IconBubble icon={icon} bg={accent} fg="#FFFFFF" size={64} />
          <Text style={styles.heroTitle}>{condition.title}</Text>
          <View style={styles.badgeRow}>
            <Badge label={formatConditionType(condition.type)} bg="rgba(255,255,255,0.55)" fg={pillColors.fg} />
            <Badge
              label={source === 'PATIENT_DECLARED' ? 'Self-reported' : source === 'DOCTOR_VERIFIED' ? 'Doctor verified' : 'Clinician entered'}
              bg="rgba(255,255,255,0.55)"
              fg={pillColors.fg}
              icon={source === 'PATIENT_DECLARED' ? 'person-outline' : 'shield-checkmark'}
            />
            <Badge
              label={conditionStatus === 'ACTIVE' ? 'Active' : 'Resolved'}
              bg={conditionStatus === 'ACTIVE' ? theme.pillGreenBg : theme.surfaceMuted}
              fg={conditionStatus === 'ACTIVE' ? theme.pillGreenText : theme.textSecondary}
              icon={conditionStatus === 'ACTIVE' ? 'pulse' : 'checkmark-circle'}
            />
          </View>
        </View>

        <View style={styles.content}>
          <DetailRow icon="calendar-outline" label="Date recorded">
            {formatDateLabel(condition.dateRecorded ?? condition.createdAt)}
          </DetailRow>
          <View style={styles.statusAction}>
            <Button
              label={conditionStatus === 'ACTIVE' ? 'Mark as resolved' : 'Mark as active'}
              variant="secondary"
              icon={conditionStatus === 'ACTIVE' ? 'checkmark-circle-outline' : 'refresh-outline'}
              onPress={handleToggleStatus}
              loading={isUpdatingStatus}
              fullWidth
            />
            <Text style={styles.statusNote}>This personal status doesn’t change the original record.</Text>
          </View>
          {condition.notes ? (
            <DetailRow icon="document-text-outline" label="Notes">
              {condition.notes}
            </DetailRow>
          ) : null}

          {deletable ? (
            <View style={styles.actionsRow}>
              <Button label="Delete" variant="danger" icon="trash-outline" onPress={handleDelete} fullWidth />
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
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 28, paddingHorizontal: 24, gap: 12 },
  heroTitle: { fontSize: 26, fontFamily: Fonts.display, fontWeight: '800', color: theme.text, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  content: { padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' },
  actionsRow: { marginTop: Spacing.four },
  statusAction: { marginTop: Spacing.four, marginBottom: Spacing.four },
  statusNote: {
    fontSize: 12,
    fontFamily: Fonts.sans.regular,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
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
