import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Fonts, Spacing, type AppTheme } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import type { Flag } from './types';

/** Palette for the app's current theme (the Light / Dark / System choice in Settings). */
export function useLabTheme(): AppTheme {
  return useTheme();
}

type Weight = keyof typeof Fonts.sans;

const WEB_WEIGHT: Record<Weight, NonNullable<TextStyle['fontWeight']>> = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

/** Native needs one font family per weight; web needs fontWeight (see the note in theme.ts). */
export function font(weight: Weight = 'regular'): TextStyle {
  return Platform.OS === 'web'
    ? { fontFamily: Fonts.sans[weight], fontWeight: WEB_WEIGHT[weight] }
    : { fontFamily: Fonts.sans[weight] };
}

// ─── Flags ───────────────────────────────────────────────────────────────────

const FLAGS: Record<Flag, { label: string; tone: 'good' | 'warn' | 'critical' }> = {
  normal: { label: 'Normal', tone: 'good' },
  low: { label: '↓ Low', tone: 'warn' },
  high: { label: '↑ High', tone: 'warn' },
  'critical-low': { label: '↓↓ Critical low', tone: 'critical' },
  'critical-high': { label: '↑↑ Critical high', tone: 'critical' },
  abnormal: { label: 'Abnormal', tone: 'warn' },
};

/** Normal → green pill, out of range → peach pill, critical → danger. The label always says it too, never color alone. */
export function flagColors(c: AppTheme, flag: Flag): { bg: string; fg: string } {
  switch (FLAGS[flag].tone) {
    case 'good':
      return { bg: c.pillGreenBg, fg: c.pillGreenText };
    case 'warn':
      return { bg: c.pillPeachBg, fg: c.pillPeachText };
    case 'critical':
      return { bg: c.dangerBg, fg: c.danger };
  }
}

export function FlagPill({ flag }: { flag: Flag }) {
  const c = useLabTheme();
  const { bg, fg } = flagColors(c, flag);
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
      }}>
      <Text style={[font('semiBold'), { color: fg, fontSize: 14 }]}>{FLAGS[flag].label}</Text>
    </View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/**
 * Deals items into columns one at a time, always onto the shortest column so far.
 * Returns the item indexes of each column; reading order stays left-to-right, top-to-bottom.
 */
export function distribute(weights: number[], columns: number): number[][] {
  const layout: number[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  weights.forEach((weight, index) => {
    let shortest = 0;
    for (let column = 1; column < columns; column++) {
      if (heights[column]! < heights[shortest]!) shortest = column;
    }
    layout[shortest]!.push(index);
    heights[shortest]! += weight;
  });
  return layout;
}

export interface MasonryItem {
  key: string;
  node: ReactNode;
  /** Roughly how tall the item is next to the others. Used until the real height is measured. */
  weight?: number;
}

/** Puts each card, in the given order, into the leftmost column that stays under `limit`. */
function packFirstFit(order: number[], heights: number[], count: number, limit: number): number[][] | undefined {
  const layout: number[][] = Array.from({ length: count }, () => []);
  const filled = new Array<number>(count).fill(0);
  for (const index of order) {
    const column = filled.findIndex((height) => height + heights[index]! <= limit);
    if (column === -1) return undefined;
    layout[column]!.push(index);
    filled[column]! += heights[index]!;
  }
  return layout.map((indexes) => indexes.sort((a, b) => a - b));
}

/**
 * Picks the fewest columns that keep the layout no taller than the full set of columns
 * would be. The tallest card sets the height of the whole collage; every short card is
 * tucked into the first column with room left under that height, so short cards stack
 * under each other instead of each standing alone in a mostly empty column.
 * `heights` are the measured card heights, in reading order.
 */
export function fewestColumns(heights: number[], columns: number, gap: number): number[][] {
  const stacked = heights.map((height) => height + gap);
  const full = distribute(stacked, columns);
  const limit =
    Math.max(0, ...full.map((indexes) => indexes.reduce((sum, index) => sum + stacked[index]!, 0))) + 0.5;

  const readingOrder = stacked.map((_, index) => index);
  const tallestFirst = [...readingOrder].sort((a, b) => stacked[b]! - stacked[a]!);
  for (let count = 1; count < columns; count++) {
    const layout =
      packFirstFit(readingOrder, stacked, count, limit) ?? packFirstFit(tallestFirst, stacked, count, limit);
    if (layout) return layout;
  }
  return full;
}

/**
 * Lays cards out side by side like a collage, using the whole width it is given: as many
 * columns as fit (never more than there are cards), one column on a phone.
 *
 * Cards are first dealt out by `weight`, then re-dealt by their measured heights so the
 * columns come out nearly even. Cards keep their natural height (a short card is never
 * stretched to match a tall one); when the short cards would only sit alone in mostly empty
 * columns, they are stacked under each other in fewer columns of the same width instead. The re-deal happens
 * when the column count or the set of cards changes, never while someone types: an error
 * message making a card taller must not move it to another column, which would remount its
 * inputs and drop the focus.
 */
export function Masonry({
  items,
  minColumnWidth = 340,
  maxColumns = 6,
  gap = Spacing.three,
  testID,
}: {
  items: MasonryItem[];
  minColumnWidth?: number;
  maxColumns?: number;
  gap?: number;
  testID?: string;
}) {
  // Until the first layout the width is unknown, which renders a single column.
  const [width, setWidth] = useState(0);
  const fits = Math.floor((width + gap) / (minColumnWidth + gap));
  const columns = Math.max(1, Math.min(maxColumns, items.length, fits));

  // What was measured for the current set of cards and column count. Once every card has
  // reported, `layout` is fixed for good (until the signature changes).
  const signature = `${columns}:${items.map((item) => item.key).join('|')}`;
  const [measured, setMeasured] = useState<{
    signature: string;
    heights: Record<string, number>;
    layout?: number[][];
  }>({ signature, heights: {} });

  const settledLayout = measured.signature === signature ? measured.layout : undefined;
  const layout = settledLayout ?? distribute(items.map((item) => item.weight ?? 1), columns);

  // Columns keep the width they would have with every column in use, so cards do not
  // balloon when some columns are dropped.
  const columnWidth = (width - gap * (columns - 1)) / columns;
  const narrowed = layout.length < columns && columnWidth > 0;

  function measure(key: string, height: number) {
    if (columns === 1) return;
    setMeasured((previous) => {
      const current = previous.signature === signature ? previous : { signature, heights: {} };
      if ('layout' in current && current.layout) return previous; // settled: typing must not move cards
      const heights = { ...current.heights, [key]: height };
      const done = items.every((item) => heights[item.key] !== undefined);
      return {
        signature,
        heights,
        layout: done
          ? fewestColumns(items.map((item) => heights[item.key]!), columns, gap)
          : undefined,
      };
    });
  }

  return (
    <View
      testID={testID}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
      {layout.map((indexes, column) => (
        <View
          key={column}
          testID={testID ? `${testID}-column-${column}` : undefined}
          style={narrowed ? { width: columnWidth, minWidth: 0, gap } : { flex: 1, minWidth: 0, gap }}>
          {indexes.map((index) => {
            const item = items[index]!;
            return (
              <View
                // Remounting on a new signature makes every card report its height again.
                key={`${signature}:${item.key}`}
                testID={testID ? `${testID}-item-${item.key}` : undefined}
                onLayout={(event) => measure(item.key, event.nativeEvent.layout.height)}>
                {item.node}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────────────

export function SectionCard({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useLabTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.backgroundElement,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 19,
          padding: 19,
          gap: 19,
        },
        style,
      ]}>
      <Text style={[font('bold'), { color: c.tintStrong, fontSize: 19 }]}>{title}</Text>
      {children}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useLabTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? c.tint : c.surfaceMuted,
        borderColor: selected ? c.tint : c.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 19,
        paddingVertical: 10,
      }}>
      <Text style={[font('medium'), { color: selected ? c.onTint : c.text, fontSize: 17 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant,
}: {
  title: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}) {
  const c = useLabTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        borderRadius: 17,
        borderWidth: 1,
        paddingVertical: 19,
        backgroundColor: primary
          ? pressed ? c.tintStrong : c.tint
          : pressed ? c.backgroundSelected : c.backgroundElement,
        borderColor: primary ? (pressed ? c.tintStrong : c.tint) : c.border,
      })}>
      <Text style={[font('bold'), { fontSize: 19, color: primary ? c.onTint : c.tintStrong }]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Critical values must be phoned through, so the lab doctor sees this before saving. */
export function CriticalBanner({ labels }: { labels: string[] }) {
  const c = useLabTheme();
  if (labels.length === 0) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: c.dangerBg,
        borderColor: c.danger,
        borderWidth: 1,
        borderRadius: 19,
        padding: 19,
        gap: 5,
      }}>
      <Text style={[font('bold'), { color: c.danger, fontSize: 18 }]}>
        Critical value: notify the ordering doctor
      </Text>
      <Text style={[font('regular'), { color: c.danger, fontSize: 17 }]}>{labels.join(', ')}</Text>
    </View>
  );
}
