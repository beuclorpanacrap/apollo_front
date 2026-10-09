import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type SparklineProps = {
  /** Oldest → newest. Fewer than 2 values renders nothing. */
  values: readonly number[];
  width?: number;
  height?: number;
  color: string;
  /** Surface the line sits on, so the highlighted last point can get a clean ring. */
  background: string;
  /** Text alternative: the chart itself is hidden from assistive tech. */
  label: string;
};

/**
 * Tiny trend line. Straight segments between real data points only (no smoothing or projection, so
 * it never suggests values that weren't measured), with the latest point emphasized.
 */
export function Sparkline({ values, width = 132, height = 40, color, background, label }: SparklineProps) {
  if (values.length < 2) return null;

  const padX = 6;
  const padY = 7;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const points = values.map((value, index) => ({
    x: padX + (index / (values.length - 1)) * innerW,
    // A flat series sits on the midline instead of dividing by zero.
    y: span === 0 ? height / 2 : padY + (1 - (value - min) / span) * innerH,
  }));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${height - 2} L${points[0].x.toFixed(1)},${height - 2} Z`;
  const last = points[points.length - 1];

  return (
    <View role="img" aria-label={label} accessibilityLabel={label} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <Path d={area} fill={color} opacity={0.12} />
        <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.slice(0, -1).map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.2} fill={background} stroke={color} strokeWidth={1.5} />
        ))}
        <Circle cx={last.x} cy={last.y} r={4.2} fill={color} stroke={background} strokeWidth={2} />
      </Svg>
    </View>
  );
}
