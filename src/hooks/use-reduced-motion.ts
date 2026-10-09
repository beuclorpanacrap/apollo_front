import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribeWeb(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const readWeb = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

/** True when the OS / browser asks for reduced motion. Live: flips if the setting changes. */
export function useReducedMotion(): boolean {
  const web = useSyncExternalStore(subscribeWeb, readWeb, () => false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setNative(value))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setNative);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return Platform.OS === 'web' ? web : native;
}

/** Non-hook read for event handlers (e.g. choosing scroll behavior). */
export function prefersReducedMotionNow(): boolean {
  return Platform.OS === 'web' && readWeb();
}
