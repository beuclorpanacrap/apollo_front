import type { TextStyle, ViewStyle } from 'react-native';

/**
 * react-native-web forwards a set of DOM props (aria-describedby, aria-current, aria-haspopup,
 * onKeyDown, tabIndex, dataSet, …) that React Native's own types don't declare. Route them through
 * this helper instead of sprinkling `any`: `<View {...webProps({ 'aria-current': 'page' })} />`.
 * Only used from web-only code paths (`*.web.tsx` pages and portal components).
 */
export function webProps(props: Record<string, unknown>): object {
  return props;
}

/**
 * Same idea for style: CSS-only properties that react-native-web passes straight through
 * (`position: 'fixed' | 'sticky'`, `backgroundImage`, `transition`, `animation`, `whiteSpace`, `cursor`…).
 */
export function webStyle(style: Record<string, unknown>): ViewStyle & TextStyle {
  return style as ViewStyle & TextStyle;
}
