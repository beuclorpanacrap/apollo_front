import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

export default function ViewPrescriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { localPrescriptions, prescriptions, removePrescription, setPrescriptionStatus } = useVault();
  const [isFulfilling, setIsFulfilling] = useState(false);

  const local = useMemo(() => localPrescriptions.find((p) => p.id === id), [localPrescriptions, id]);
  const remote = useMemo(() => (!local ? prescriptions.find((p) => p.id === id) : undefined), [local, prescriptions, id]);

  const record = local
    ? {
        name: local.medicationName,
        dosage: local.dosage,
        frequency: local.frequency,
        instructions: local.instructions,
        date: local.dateAdded,
        status: local.status ?? 'ACTIVE',
      }
    : remote
      ? {
          name: remote.medicationName,
          dosage: remote.dosage,
          frequency: undefined as string | undefined,
          instructions: remote.instructions,
          date: remote.issuedAt,
          status: remote.status ?? 'ACTIVE',
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

  const handleEdit = () => router.push({ pathname: '/vault/add-prescription', params: { editId: id } });
  const handleFulfill = async () => {
    setIsFulfilling(true);
    try {
      await setPrescriptionStatus(id, !!local, record.status === 'ACTIVE' ? 'FULFILLED' : 'ACTIVE');
    } catch (err) {
      console.warn('[view-prescription] status update failed:', err);
      Alert.alert('Could not update prescription', 'Please try again.');
    } finally {
      setIsFulfilling(false);
    }
  };
  const handleDelete = async () => {
    const confirmed = await confirmAsync('Delete this prescription?', "This can't be undone.");
    if (!confirmed) return;
    await removePrescription(id);
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
        <View style={[styles.hero, { backgroundColor: theme.pillMarigoldBg }]}>
          <IconBubble icon="medical" bg={BrandColors.marigold} fg="#FFFFFF" size={64} />
          <Text style={styles.heroTitle}>{record.name}</Text>
          <Badge
            label={local ? 'Logged by you' : 'Doctor verified'}
            bg={local ? theme.pillPeachBg : theme.pillGreenBg}
            fg={local ? theme.pillPeachText : theme.pillGreenText}
            icon={local ? 'person' : 'shield-checkmark'}
          />
          {record.status === 'FULFILLED' || record.status === 'CANCELLED' ? (
            <Badge
              label={record.status === 'FULFILLED' ? 'Fulfilled' : 'Cancelled'}
              bg={record.status === 'FULFILLED' ? theme.pillGreenBg : theme.surfaceMuted}
              fg={record.status === 'FULFILLED' ? theme.pillGreenText : theme.textSecondary}
              icon={record.status === 'FULFILLED' ? 'checkmark-circle' : 'close-circle'}
            />
          ) : null}
        </View>

        <View style={styles.content}>
          {record.status !== 'CANCELLED' ? (
            <View style={styles.fulfillAction}>
              <Button
                label={record.status === 'ACTIVE' ? "I'm done taking this" : 'Mark as active'}
                variant="secondary"
                icon={record.status === 'ACTIVE' ? 'checkmark-circle-outline' : 'refresh-outline'}
                onPress={handleFulfill}
                loading={isFulfilling}
                fullWidth
              />
              <Text style={styles.fulfillHint}>
                {record.status === 'ACTIVE'
                  ? 'This will keep the prescription in your history.'
                  : 'This moves the prescription back to your active list.'}
              </Text>
            </View>
          ) : null}
          {record.dosage ? (
            <DetailRow icon="fitness-outline" label="Dosage">
              {record.dosage}
            </DetailRow>
          ) : null}
          {record.frequency ? (
            <DetailRow icon="repeat-outline" label="Frequency">
              {record.frequency}
            </DetailRow>
          ) : null}
          {record.instructions ? (
            <DetailRow icon="document-text-outline" label="Instructions">
              {record.instructions}
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
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 28, paddingHorizontal: 24, gap: 12 },
  heroTitle: { fontSize: 26, fontFamily: Fonts.display, fontWeight: '800', color: theme.text, textAlign: 'center' },
  content: { padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.four },
  fulfillAction: { marginBottom: Spacing.four },
  fulfillHint: {
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
