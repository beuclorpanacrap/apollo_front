import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
export type ClinicianIconName = React.ComponentProps<typeof Ionicons>['name'];
// Native Text renders a div on web outside a Text ancestor. Use an inline glyph
// so icons remain valid children of paragraphs, labels, and buttons.
export function ClinicianIcon({ name, size = 20 }: { name: ClinicianIconName; size?: number }) {
  const [loaded] = useFonts(Ionicons.font);
  const glyph = Ionicons.glyphMap[name];
  return <span aria-hidden="true" style={{ display: 'inline-block', flexShrink: 0, width: size, height: size, fontFamily: 'ionicons', fontSize: size, lineHeight: 1, fontWeight: 'normal', fontStyle: 'normal' }}>{loaded ? (typeof glyph === 'number' ? String.fromCodePoint(glyph) : glyph) : ''}</span>;
}

