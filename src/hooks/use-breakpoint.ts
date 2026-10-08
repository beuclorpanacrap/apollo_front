import { useWindowDimensions } from 'react-native';

import { Layout } from '@/constants/theme';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/**
 * Coarse layout class for the portal.
 *  phone   < 600   single column, bottom-sheet dialogs, 2-column stat grids
 *  tablet  < 900   single column with roomier spacing, compact (menu-button) navigation
 *  desktop >= 900  full navigation, multi-column layouts
 */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint = width < Layout.phone ? 'phone' : width < Layout.tablet ? 'tablet' : 'desktop';
  return {
    width,
    height,
    breakpoint,
    isPhone: breakpoint === 'phone',
    isCompactNav: width < Layout.tablet,
    isWide: width >= Layout.desktop,
  };
}
