import { Platform, type ViewStyle } from 'react-native';

import { Motion, type AppTheme } from '@/constants/theme';
import { useKeyboardModality } from '@/hooks/use-keyboard-modality';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { webStyle } from '@/utils/web-props';

/** react-native-web's Pressable passes `hovered` and `focused` next to RN's `pressed`. */
export type PressState = { pressed: boolean; hovered: boolean; focused: boolean };

export function pressState(state: unknown): PressState {
  const s = (state ?? {}) as Partial<PressState>;
  return { pressed: !!s.pressed, hovered: !!s.hovered, focused: !!s.focused };
}

/**
 * Shared hover / focus-visible / motion behaviour for the portal's pressable surfaces.
 * - `ring()` paints the 2px `focusRing` outline (2px offset) only for keyboard focus.
 * - `transition` eases background / border / shadow changes; it is `null` under reduced motion.
 */
export function useInteractive() {
  const keyboard = useKeyboardModality();
  const reduced = useReducedMotion();

  const ring = (theme: AppTheme, state: PressState): ViewStyle | null =>
    state.focused && keyboard
      ? webStyle({ outlineColor: theme.focusRing, outlineOffset: 2, outlineStyle: 'solid', outlineWidth: 2 })
      : null;

  const transition: ViewStyle | null =
    Platform.OS === 'web' && !reduced
      ? webStyle({
          transitionProperty: 'background-color, border-color, box-shadow, opacity, transform, color',
          transitionDuration: `${Motion.fast}ms`,
          transitionTimingFunction: Motion.easing,
        })
      : null;

  return { keyboard, reduced, ring, transition };
}
