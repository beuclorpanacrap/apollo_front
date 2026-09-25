import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert()` with multiple buttons is a complete no-op on
 * react-native-web — its implementation is literally `static alert() {}`
 * (see node_modules/react-native-web/.../exports/Alert). So any "are you
 * sure you want to delete this?" flow built directly on Alert.alert shows
 * no dialog in a browser, and the button's onPress — which is what actually
 * performs the delete — never fires. These two helpers wrap that platform
 * difference behind one awaitable call: native keeps the existing
 * Alert.alert treatment, web falls back to the browser's built-in
 * confirm()/alert().
 */

/** Yes/No confirmation before a destructive action. Resolves true only if the person confirms. */
export function confirmAsync(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Single-button informational alert, e.g. reporting that an action failed. */
export function notifyAsync(title: string, message: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    }
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }], { onDismiss: () => resolve() });
  });
}
