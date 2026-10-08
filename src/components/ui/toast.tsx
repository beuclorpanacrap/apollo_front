import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Motion, Radii, Space, elevationStyle } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { TONE_ICON, useAlertColors, type AlertTone } from './inline-alert';
import { pressState, useInteractive } from './interactive';

export type ToastInput = {
  tone?: AlertTone;
  title?: string;
  message: string;
  /** ms before auto-dismiss (default 5000, errors 8000). `0` keeps it until dismissed. */
  duration?: number;
  action?: { label: string; onPress: () => void };
};

type ToastItem = ToastInput & { id: string; closing: boolean };

type ToastApi = { show: (toast: ToastInput) => string; dismiss: (id: string) => void };

const ToastContext = createContext<ToastApi>({ show: () => '', dismiss: () => {} });

/** `const toast = useToast(); toast.show({ tone: 'success', message: 'Saved' })`. A no-op without a provider. */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [paused, setPaused] = useState(false);
  const counter = useRef(0);
  const reduced = useReducedMotion();

  const remove = useCallback((id: string) => setItems((list) => list.filter((toast) => toast.id !== id)), []);

  const dismiss = useCallback(
    (id: string) => {
      if (reduced) {
        remove(id);
        return;
      }
      setItems((list) => list.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
      setTimeout(() => remove(id), Motion.fast);
    },
    [reduced, remove],
  );

  const show = useCallback((input: ToastInput) => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    setItems((list) => [...list.slice(-(MAX_VISIBLE - 1)), { ...input, id, closing: false }]);
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} paused={paused} setPaused={setPaused} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  items,
  paused,
  setPaused,
  onDismiss,
}: {
  items: ToastItem[];
  paused: boolean;
  setPaused: (paused: boolean) => void;
  onDismiss: (id: string) => void;
}) {
  const { isPhone } = useBreakpoint();
  if (Platform.OS !== 'web' || items.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        gap: Space[3],
        // The container never blocks the page; only the toasts themselves take pointer events.
        pointerEvents: 'none',
        ...(isPhone
          ? { left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }
          : { right: 24, bottom: 24, width: 'min(400px, calc(100vw - 48px))' }),
      }}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} paused={paused} setPaused={setPaused} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  paused,
  setPaused,
  onDismiss,
}: {
  item: ToastItem;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const isDark = useIsDark();
  const fx = useInteractive();
  const colors = useAlertColors(item.tone ?? 'info');
  const tone = item.tone ?? 'info';

  const duration = item.duration ?? (tone === 'error' ? 8000 : 5000);
  const remaining = useRef(duration);

  // Auto-dismiss, pausable: hovering/focusing any toast freezes every countdown and resumes with the time left.
  useEffect(() => {
    if (duration === 0 || paused || item.closing) return;
    const startedAt = Date.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [duration, paused, item.closing, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        pointerEvents: 'auto',
        animation: fx.reduced
          ? 'none'
          : item.closing
            ? `ap-fade-out ${Motion.fast}ms ${Motion.easing} both`
            : `ap-rise-in ${Motion.base}ms ${Motion.easing} both`,
      }}
    >
      <View
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderLeftColor: colors.accent },
          elevationStyle('raised', isDark),
        ]}
      >
        <Ionicons name={TONE_ICON[tone]} size={22} color={colors.accent} style={styles.icon} />
        <View style={styles.body}>
          {item.title ? <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text> : null}
          <Text style={[styles.message, { color: item.title ? theme.textMuted : theme.text }]}>{item.message}</Text>
          {item.action ? (
            <Pressable
              onPress={() => {
                item.action?.onPress();
                onDismiss();
              }}
              accessibilityRole="button"
              style={(state) => [styles.action, fx.ring(theme, pressState(state))]}
            >
              <Text style={[styles.actionLabel, { color: theme.accentText }]}>{item.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={(state) => {
            const s = pressState(state);
            return [styles.dismiss, { backgroundColor: s.hovered ? theme.surfaceMuted : 'transparent' }, fx.ring(theme, s)];
          }}
        >
          <Ionicons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[3],
    paddingVertical: Space[3],
    paddingLeft: Space[4],
    paddingRight: Space[2],
    borderRadius: Radii.md,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, minWidth: 0, paddingVertical: 1 },
  title: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.bold, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.regular },
  action: { alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center', marginTop: 4 },
  actionLabel: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.bold, fontWeight: '700', textDecorationLine: 'underline' },
  dismiss: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
