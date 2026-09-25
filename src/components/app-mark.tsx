import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { BrandColors } from '@/constants/theme';

type AppMarkProps = {
  size?: number;
  heartColor?: string;
};

/**
 * The Apollo mark: a rounded green square with a soft bottom bevel and a
 * solid heart glyph. Drawn as vector so it always matches the current
 * brand colors instead of a baked-in raster export.
 */
export function AppMark({ size = 96, heartColor = '#FFFDF7' }: AppMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="appMarkSquircle">
          <Rect x={0} y={0} width={100} height={100} rx={26} />
        </ClipPath>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={100}
        height={100}
        rx={26}
        fill={BrandColors.springGreen}
        clipPath="url(#appMarkSquircle)"
      />
      <Rect
        x={0}
        y={91}
        width={100}
        height={9}
        fill={BrandColors.deepGreen}
        clipPath="url(#appMarkSquircle)"
      />
      <Path
        d="M50,73 C50,73 25,54.5 25,37.5 C25,25 35,19 44.5,23.5 C47.5,25 49.3,27.8 50,31 C50.7,27.8 52.5,25 55.5,23.5 C65,19 75,25 75,37.5 C75,54.5 50,73 50,73 Z"
        fill={heartColor}
      />
    </Svg>
  );
}
