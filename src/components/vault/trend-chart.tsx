import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TrendSeries } from '@/utils/lab-trends';
import { formatDateLabel } from '@/utils/vault-display';
import { flagColors } from '../LabUI';
import type { Flag } from '../types';

const PAD = { left: 44, right: 14, top: 12, bottom: 12 };

export const formatNumber = (v: number) => String(Number(v.toFixed(2)));

const FLAG_TEXT: Record<Flag, string> = {
  normal: 'Normal',
  low: 'Low',
  high: 'High',
  'critical-low': 'Critical low',
  'critical-high': 'Critical high',
  abnormal: 'Abnormal',
};

const dayMs = (date: string) => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Evolution of one measured value over time, with its reference range shaded. */
export function TrendChart({ series, height = 170 }: { series: TrendSeries; height?: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const { points, range, unit } = series;
  const selected = Math.min(picked ?? points.length - 1, points.length - 1);

  const geometry = useMemo(() => {
    const values = points.map((p) => p.value);
    const lows = [...values, ...(range?.min !== undefined ? [range.min] : [])];
    const highs = [...values, ...(range?.max !== undefined ? [range.max] : [])];
    let lo = Math.min(...lows);
    let hi = Math.max(...highs);
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.1 || 1;
      lo -= pad;
      hi += pad;
    }
    // Round outwards to a tidy step so the two axis labels read as clean numbers.
    const raw = (hi - lo) / 3;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const step = pow * ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10);
    return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step };
  }, [points, range]);

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = height - PAD.top - PAD.bottom;
  const first = dayMs(points[0]!.date);
  const span = dayMs(points[points.length - 1]!.date) - first;

  const x = (i: number) => PAD.left + (span === 0 ? plotW / 2 : ((dayMs(points[i]!.date) - first) / span) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - geometry.lo) / (geometry.hi - geometry.lo)) * plotH;

  const bandTop = range?.max !== undefined ? y(Math.min(range.max, geometry.hi)) : PAD.top;
  const bandBottom = range?.min !== undefined ? y(Math.max(range.min, geometry.lo)) : PAD.top + plotH;

  function pick(e: GestureResponderEvent) {
    // Native gives locationX; on web onPress hands over the DOM click event, which has offsetX.
    const native = e.nativeEvent as { locationX?: number; offsetX?: number };
    const px = native.locationX ?? native.offsetX ?? 0;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    }
    setPicked(best);
  }

  const point = points[selected]!;
  const flag = point.flag;
  const flagTint = flag && flag !== 'normal' ? flagColors(theme, flag).fg : theme.tintStrong;
  const summary =
    `${series.label}: ${points.length} results from ${formatDateLabel(points[0]!.date)} ` +
    `to ${formatDateLabel(points[points.length - 1]!.date)}, latest ${formatNumber(points[points.length - 1]!.value)} ${unit ?? ''}`.trim();

  return (
    <View>
      <View style={styles.readout}>
        <Text style={[styles.readoutValue, { color: flagTint }]}>
          {formatNumber(point.value)}
          {unit ? <Text style={[styles.readoutUnit, { color: theme.textSecondary }]}>{` ${unit}`}</Text> : null}
        </Text>
        <Text style={[styles.readoutMeta, { color: theme.textSecondary }]}>
          {formatDateLabel(point.date)}
          {flag && flag !== 'normal' ? ` · ${FLAG_TEXT[flag]}` : ''}
        </Text>
      </View>

      <Pressable
        onPress={pick}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={summary}
        style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height} pointerEvents="none">
            {range ? (
              <Rect
                x={PAD.left}
                y={Math.min(bandTop, bandBottom)}
                width={plotW}
                height={Math.abs(bandBottom - bandTop)}
                fill={theme.tint}
                opacity={0.14}
              />
            ) : null}
            {[geometry.hi, geometry.lo].map((v, i) => (
              <Line
                key={i}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(v)}
                y2={y(v)}
                stroke={theme.border}
                strokeWidth={1}
              />
            ))}
            {[geometry.hi, geometry.lo].map((v, i) => (
              <SvgText
                key={`t${i}`}
                x={PAD.left - 6}
                y={y(v) + (i === 0 ? 10 : -3)}
                fontSize={10}
                fill={theme.textTertiary}
                textAnchor="end">
                {formatNumber(v)}
              </SvgText>
            ))}
            {points.length > 1 ? (
              <Polyline
                points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
                fill="none"
                stroke={theme.tintStrong}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {points.map((p, i) => {
              const out = p.flag && p.flag !== 'normal';
              const color = out ? flagColors(theme, p.flag!).fg : theme.tintStrong;
              return (
                <Circle
                  key={`${p.sourceId}-${i}`}
                  cx={x(i)}
                  cy={y(p.value)}
                  r={i === selected ? 6 : 4}
                  fill={color}
                  stroke={theme.backgroundElement}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
        ) : null}
      </Pressable>

      <View style={styles.axis}>
        <Text style={[styles.axisText, { color: theme.textTertiary }]}>{formatDateLabel(points[0]!.date)}</Text>
        {points.length > 1 ? (
          <Text style={[styles.axisText, { color: theme.textTertiary }]}>
            {formatDateLabel(points[points.length - 1]!.date)}
          </Text>
        ) : null}
      </View>
      {range ? (
        <Text style={[styles.legend, { color: theme.textTertiary }]}>Shaded area is the reference range</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.one },
  readoutValue: { fontSize: 22, fontFamily: Fonts.sans.extraBold, fontWeight: '800' },
  readoutUnit: { fontSize: 13, fontFamily: Fonts.sans.regular, fontWeight: '400' },
  readoutMeta: { fontSize: 12, fontFamily: Fonts.sans.medium, fontWeight: '500' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: PAD.left, paddingRight: PAD.right },
  axisText: { fontSize: 11, fontFamily: Fonts.sans.regular },
  legend: { fontSize: 11, fontFamily: Fonts.sans.regular, marginTop: Spacing.one },
});
