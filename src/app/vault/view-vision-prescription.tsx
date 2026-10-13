import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Badge, IconBubble } from '@/components/ui/badge';
import { DetailRow } from '@/components/ui/detail-row';
import { VisionTable } from '@/components/vision/vision-table';
import { AppTheme, BrandColors, Fonts } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLabel } from '@/utils/vault-display';
import { formatPupillaryDistance, isVisionExpired } from '@/utils/vision';

export default function ViewVisionPrescriptionScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { visionPrescriptions } = useVault();

  const record = useMemo(
    () => visionPrescriptions.find((rx, index) => (rx.id ?? `vision-${rx.issuedAt ?? index}`) === id),
    [visionPrescriptions, id],
  );

  const back = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={22} color={theme.text} />
      </Pressable>
      <View style={styles.headerButton} />
    </View>
  );

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {back}
        <View style={styles.notFoundBody}>
          <Ionicons name="help-circle-outline" size={32} color={theme.textTertiary} />
          <Text style={styles.notFoundText}>This record couldn’t be found — it may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const expired = isVisionExpired(record);

  return (
    <SafeAreaView style={styles.safeArea}>
      {back}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: theme.pillIrisBg }]}>
          <IconBubble icon="eye" bg={BrandColors.iris} fg="#FFFFFF" size={64} />
          <Text style={styles.heroTitle}>Glasses prescription</Text>
          <View style={styles.heroBadges}>
            <Badge label="Doctor verified" bg={theme.pillGreenBg} fg={theme.pillGreenText} icon="shield-checkmark" />
            {expired ? <Badge label="Expired" bg={theme.pillMarigoldBg} fg={theme.pillMarigoldText} icon="time" /> : null}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.tableWrap}>
            <VisionTable rx={record} />
          </View>

          {typeof record.pupillaryDistanceMm === 'number' ? (
            <DetailRow icon="resize-outline" label="Pupillary distance">
              {formatPupillaryDistance(record.pupillaryDistanceMm)}
            </DetailRow>
          ) : null}
          {record.notes?.trim() ? (
            <DetailRow icon="document-text-outline" label="Notes">
              {record.notes}
            </DetailRow>
          ) : null}
          {record.doctorName ? (
            <DetailRow icon="person-outline" label="Prescribed by">
              {record.doctorName}
            </DetailRow>
          ) : null}
          <DetailRow icon="calendar-outline" label="Issued">
            {formatDateLabel(record.issuedAt)}
          </DetailRow>
          {record.expiresAt ? (
            <DetailRow icon="time-outline" label="Valid until">
              {formatDateLabel(record.expiresAt)}
            </DetailRow>
          ) : null}

          <View style={styles.readOnlyNote}>
            <Ionicons name="shield-checkmark" size={16} color={theme.tintStrong} />
            <Text style={styles.readOnlyNoteText}>
              Added by your doctor. Doctor-authored records can’t be edited or deleted.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
    headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 40 },
    hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 28, paddingHorizontal: 24, gap: 12 },
    heroTitle: { fontSize: 26, fontFamily: Fonts.display, fontWeight: '800', color: theme.text, textAlign: 'center' },
    heroBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    content: { padding: 24, maxWidth: 600, alignSelf: 'center', width: '100%' },
    tableWrap: { marginBottom: 20 },
    readOnlyNote: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.pillGreenBg,
      borderRadius: 12,
      padding: 14,
      marginTop: 8,
    },
    readOnlyNoteText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.pillGreenText, lineHeight: 17 },
    notFoundBody: { padding: 32, alignItems: 'center', gap: 10 },
    notFoundText: { fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.textSecondary, textAlign: 'center' },
  });
}
