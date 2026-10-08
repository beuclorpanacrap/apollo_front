import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Badge, IconBubble } from '@/components/ui/badge';
import { LabResultView } from '@/components/LabResultView';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/ui/detail-row';
import { TrendCard } from '@/components/vault/trend-card';
import { AppTheme, BrandColors, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVault } from '@/context/vault-context';
import { confirmAsync } from '@/utils/confirm';
import { allFields } from '@/components/evaluate';
import { buildTrendSeries, getLabPanel, seriesKey } from '@/utils/lab-trends';
import { formatDateLabel } from '@/utils/vault-display';

/** Graphs for the values on this result that have been measured more than once. */
function useTrendsFor(
  panelInfo: ReturnType<typeof getLabPanel>,
  testName: string | undefined,
  numericValue: number | undefined,
  localLabResults: ReturnType<typeof useVault>['localLabResults'],
  testResults: ReturnType<typeof useVault>['testResults']
) {
  return useMemo(() => {
    const wanted = new Set<string>();
    if (panelInfo) {
      const labels = new Map(allFields(panelInfo.template).map((f) => [f.key, f.label] as const));
      for (const entry of panelInfo.panel.entries) {
        if (typeof entry.value === 'number') wanted.add(seriesKey(labels.get(entry.key) ?? entry.key));
      }
    } else if (testName && numericValue != null) {
      wanted.add(seriesKey(testName));
    }
    return buildTrendSeries(localLabResults, testResults).filter(
      (series) => wanted.has(series.key) && series.points.length >= 2
    );
  }, [panelInfo, testName, numericValue, localLabResults, testResults]);
}

export default function ViewLabResultScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { localLabResults, testResults, remoteLabGroups, removeLabResult } = useVault();

  const local = useMemo(() => localLabResults.find((l) => l.id === id), [localLabResults, id]);
  const group = useMemo(() => (!local ? remoteLabGroups.find((g) => g.id === id) : undefined), [local, remoteLabGroups, id]);
  const remote = useMemo(
    () => (!local && !group ? testResults.find((l) => l.id === id) : undefined),
    [local, group, testResults, id]
  );

  const panelInfo = useMemo(() => {
    if (local) return getLabPanel(local);
    if (!group) return undefined;
    return {
      template: group.template,
      panel: { templateCode: group.template.code, templateVersion: group.template.version, status: 'final' as const, entries: group.entries },
    };
  }, [local, group]);

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
    : group
      ? {
          name: group.template.name,
          numericValue: undefined as number | undefined,
          unit: undefined as string | undefined,
          referenceRange: undefined as string | undefined,
          freeformResult: undefined as string | undefined,
          date: group.recordedAt,
          doctorName: group.doctorName,
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

  const trends = useTrendsFor(panelInfo, record?.name, record?.numericValue, localLabResults, testResults);

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

  const hasStat = record.numericValue != null && !panelInfo;
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
          {panelInfo ? (
            <View style={{ marginBottom: Spacing.three }}>
              <LabResultView template={panelInfo.template} entries={panelInfo.panel.entries} showTitle={false} />
            </View>
          ) : null}
          {trends.length > 0 ? (
            <View style={styles.trends}>
              <Text style={styles.trendsTitle}>Over time</Text>
              {trends.map((series) => (
                <TrendCard key={series.key} series={series} />
              ))}
            </View>
          ) : null}
          {record.freeformResult && !panelInfo ? (
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
    trends: { marginBottom: Spacing.three, gap: Spacing.one },
    trendsTitle: { fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
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
}
