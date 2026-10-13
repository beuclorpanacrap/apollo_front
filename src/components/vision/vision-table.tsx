import { StyleSheet, Text, View } from 'react-native';

import type { VisionPrescriptionResponse } from '@/api/vision.types';
import { Fonts, Radii, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  VISION_EYES,
  formatAxis,
  formatPower,
  formatSphere,
  hasCorrection,
} from '@/utils/vision';

const COLUMNS = ['Sphere', 'Cylinder', 'Axis', 'Add'] as const;

/**
 * The prescription the way an optician reads it: one row per eye, one column per value.
 * Shared by the clinician portal (web) and the patient's vault, so it uses plain react-native views.
 */
export function VisionTable({ rx }: { rx: Pick<VisionPrescriptionResponse, 'rightEye' | 'leftEye'> }) {
  const theme = useTheme();

  return (
    <View
      role="table"
      aria-label="Glasses prescription by eye"
      style={[styles.table, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
    >
      <View role="row" style={[styles.row, styles.headRow, { backgroundColor: theme.surfaceMuted }]}>
        <View style={styles.eyeCell} role="columnheader">
          <Text style={[styles.head, { color: theme.textMuted }]}>Eye</Text>
        </View>
        {COLUMNS.map((column) => (
          <View key={column} style={styles.cell} role="columnheader">
            <Text style={[styles.head, { color: theme.textMuted }]}>{column}</Text>
          </View>
        ))}
      </View>

      {VISION_EYES.map((eye, index) => {
        const values = eye.key === 'right' ? rx.rightEye : rx.leftEye;
        const prescribed = hasCorrection(values);
        const cells = [
          formatSphere(values?.sphere),
          values?.cylinder ? formatPower(values.cylinder) : '—',
          values?.cylinder ? formatAxis(values.axis) : '—',
          formatPower(values?.add),
        ];
        return (
          <View
            key={eye.key}
            role="row"
            style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border }, index === 0 && styles.firstBodyRow]}
          >
            <View style={styles.eyeCell} role="rowheader">
              <Text style={[styles.eyeName, { color: theme.text }]}>{eye.label}</Text>
              <Text style={[styles.eyeAbbr, { color: theme.textMuted }]}>{eye.abbr}</Text>
            </View>
            {prescribed ? (
              cells.map((text, cellIndex) => (
                <View key={COLUMNS[cellIndex]} style={styles.cell} role="cell">
                  <Text
                    style={[styles.value, { color: text === '—' ? theme.textMuted : theme.text }]}
                    accessibilityLabel={text === '—' ? 'None' : undefined}
                  >
                    {text}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.notPrescribed} role="cell">
                <Text style={[styles.value, { color: theme.textMuted }]}>No correction</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: Radii.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space[3], paddingVertical: Space[3], gap: Space[2] },
  headRow: { paddingVertical: Space[2] },
  firstBodyRow: { borderTopWidth: 0 },
  eyeCell: { flex: 1.5, minWidth: 84 },
  cell: { flex: 1, minWidth: 52, alignItems: 'flex-end' },
  notPrescribed: { flex: 4, alignItems: 'flex-end' },
  head: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  eyeName: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  eyeAbbr: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.regular },
  value: { fontSize: 15, lineHeight: 22, fontFamily: Fonts.sans.semiBold, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
