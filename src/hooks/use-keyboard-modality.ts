import { useSyncExternalStore } from 'react';

/**
 * `:focus-visible` for react-native-web's Pressable.
 *
 * Pressable's `focused` flag is true after a mouse click as well, which would paint focus rings on
 * every click. Browsers only show a ring for keyboard focus, so we track the last input modality
 * globally and let components show the ring only when `focused && keyboard`.
 */
let keyboard = false;
let installed = false;
const listeners = new Set<() => void>();

function setKeyboard(next: boolean) {
  if (keyboard === next) return;
  keyboard = next;
  listeners.forEach((listener) => listener());
}

function install() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'keydown',
    (event) => {
      // Ignore pure modifier presses and shortcuts such as Cmd+C.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      setKeyboard(true);
    },
    true,
  );
  const pointer = () => setKeyboard(false);
  document.addEventListener('mousedown', pointer, true);
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('touchstart', pointer, true);
}

function subscribe(listener: () => void) {
  install();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True while the most recent input was the keyboard. Always false on native. */
export function useKeyboardModality(): boolean {
  return useSyncExternalStore(subscribe, () => keyboard, () => false);
}
