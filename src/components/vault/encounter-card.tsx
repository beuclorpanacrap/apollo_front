import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ClinicalEncounterSummaryDto } from '@/api/vault.api';
import { Badge, IconBubble } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BrandColors, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLabel } from '@/utils/vault-display';

type EncounterCardProps = {
  encounter: ClinicalEncounterSummaryDto;
};

export function EncounterCard({ encounter }: EncounterCardProps) {
  const theme = useTheme();

  const title = encounter.diagnosis || 'Consultation Summary';
  const doctorInfo = [encounter.doctorName, encounter.doctorSpecialty].filter(Boolean).join(' • ');
  const dateLabel = formatDateLabel(encounter.encounterDate || encounter.createdAt);

  return (
    <Card accentColor={theme.tint} style={styles.card}>
      <View style={styles.row}>
        <IconBubble icon="medkit" bg={theme.pillGreenBg} fg={theme.pillGreenText} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.date, { color: theme.textTertiary }]}>{dateLabel}</Text>
          </View>

          {doctorInfo ? (
            <Text style={[styles.doctor, { color: theme.textSecondary }]} numberOfLines={1}>
              {doctorInfo}
            </Text>
          ) : null}

          {encounter.clinicalNotes ? (
            <Text style={[styles.notes, { color: theme.text }]} numberOfLines={3}>
              {encounter.clinicalNotes}
            </Text>
          ) : null}

          <View style={styles.footerRow}>
            <View style={styles.footerBadges}>
              <Badge
                label="Doctor verified"
                bg={theme.pillGreenBg}
                fg={theme.pillGreenText}
                icon="shield-checkmark"
              />
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.three },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  date: { fontSize: 11, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  doctor: { fontSize: 13, fontFamily: Fonts.sans.medium, fontWeight: '500', marginTop: 2 },
  notes: { fontSize: 13, fontFamily: Fonts.sans.regular, marginTop: 6, lineHeight: 18 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
});
