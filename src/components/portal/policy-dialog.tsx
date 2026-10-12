import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Fonts, Space } from '@/constants/theme';
import type { PolicyContent } from '@/content/legal';
import { useTheme } from '@/hooks/use-theme';
import { webProps } from '@/utils/web-props';

/** Privacy / Terms in the portal's `Dialog` (focus trap, Escape, restore). Same `PolicyContent` as Settings. */
export function PolicyDialog({ content, onClose }: { content: PolicyContent | null; onClose: () => void }) {
  const theme = useTheme();
  // Keep showing the last policy while the dialog fades out.
  const [last, setLast] = useState(content);
  if (content && content !== last) setLast(content);
  const shown = content ?? last;

  return (
    <Dialog
      visible={!!content}
      icon="document-text-outline"
      title={shown?.title ?? ''}
      description={shown?.subtitle}
      size="md"
      dismissOnBackdrop
      initialFocus="#policy-done"
      onRequestClose={onClose}
      footer={<Button id="policy-done" label="Understood" portal size="compact" onPress={onClose} />}
    >
      <View style={{ gap: Space[5] }}>
        {shown?.updated ? (
          <Text style={{ fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.medium, fontWeight: '500', color: theme.textMuted }}>{shown.updated}</Text>
        ) : null}
        {shown?.sections.map((section) => (
          <View key={section.heading} style={{ gap: 4 }}>
            <Text role="heading" {...webProps({ 'aria-level': 3 })} style={{ fontSize: 15, lineHeight: 22, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text }}>
              {section.heading}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans.regular, color: theme.textMuted }}>{section.body}</Text>
          </View>
        ))}
      </View>
    </Dialog>
  );
}
