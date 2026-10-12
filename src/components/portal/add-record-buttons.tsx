import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Space } from '@/constants/theme';
import type { RecordKind } from '@/context/clinician-vault-context';

/** "Add encounter / prescription / lab result". Lab entry is hidden for roles that can't record labs (pharmacists). */
export function AddRecordButtons({
  canLab,
  canAdd,
  onAdd,
  disabled,
  stacked,
}: {
  canLab: boolean;
  canAdd: boolean;
  onAdd: (kind: RecordKind) => void;
  disabled?: boolean;
  stacked?: boolean;
}) {
  const off = !canAdd || !!disabled;
  if (stacked) {
    return (
      <View style={{ gap: Space[3], alignSelf: 'stretch' }}>
        <Button label="Add encounter" icon="add" size="compact" portal fullWidth disabled={off} onPress={() => onAdd('encounter')} />
        <View style={{ flexDirection: 'row', gap: Space[3] }}>
          <View style={{ flex: 1 }}>
            <Button label="Prescription" icon="add" size="compact" portal variant="secondary" fullWidth disabled={off} onPress={() => onAdd('prescription')} accessibilityLabel="Add prescription" />
          </View>
          {canLab ? (
            <View style={{ flex: 1 }}>
              <Button label="Lab result" icon="add" size="compact" portal variant="secondary" fullWidth disabled={off} onPress={() => onAdd('lab')} accessibilityLabel="Add lab result" />
            </View>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space[3] }}>
      <Button label="Add encounter" icon="add" size="compact" portal disabled={off} onPress={() => onAdd('encounter')} />
      <Button label="Add prescription" icon="add" size="compact" portal variant="secondary" disabled={off} onPress={() => onAdd('prescription')} />
      {canLab ? <Button label="Add lab result" icon="add" size="compact" portal variant="secondary" disabled={off} onPress={() => onAdd('lab')} /> : null}
    </View>
  );
}
