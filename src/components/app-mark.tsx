import Svg, { Path, Rect } from 'react-native-svg';

import { BrandColors } from '@/constants/theme';

type AppMarkProps = {
  size?: number;
  heartColor?: string;
};

/**
 * The Apollo mark: a rounded green square with a soft bottom bevel and a
 * solid heart glyph. Drawn with self-contained vector geometry matching
 * the squircle's bottom corner radius (rx=26), eliminating SVG clipPath
 * DOM ID collisions across screen mounts and tab transitions.
 */
export function AppMark({ size = 96, heartColor = '#FFFDF7' }: AppMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect
        x={0}
        y={0}
        width={100}
        height={100}
        rx={26}
        fill={BrandColors.springGreen}
      />
      <Path
        d="M6.33,91 A26,26 0 0,0 26,100 L74,100 A26,26 0 0,0 93.67,91 Z"
        fill={BrandColors.deepGreen}
      />
      <Path
        d="M50,73 C50,73 25,54.5 25,37.5 C25,25 35,19 44.5,23.5 C47.5,25 49.3,27.8 50,31 C50.7,27.8 52.5,25 55.5,23.5 C65,19 75,25 75,37.5 C75,54.5 50,73 50,73 Z"
        fill={heartColor}
      />
    </Svg>
  );
}
