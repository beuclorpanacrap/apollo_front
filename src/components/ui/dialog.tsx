import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createPortal } from 'react-dom';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Motion, Radii, Space, elevationStyle } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { webProps } from '@/utils/web-props';
import { IconBubble } from './badge';
import { pressState, useInteractive } from './interactive';
import { useLockScroll } from './scroll-lock';

export type DialogCloseReason = 'escape' | 'backdrop' | 'close';
type IconName = ComponentProps<typeof Ionicons>['name'];

export type DialogProps = {
  visible: boolean;
  /**
   * Called for Escape, backdrop click (only when `dismissOnBackdrop`) and the close button. The caller
   * decides what happens — ignore the call to veto it (e.g. a dirty form asks "Discard?" first).
   */
  onRequestClose: (reason: DialogCloseReason) => void;
  title: string;
  description?: string;
  icon?: IconName;
  tone?: 'default' | 'danger';
  /** `alertdialog` for confirmations that interrupt (sign out, discard changes, session expired). */
  role?: 'dialog' | 'alertdialog';
  size?: 'sm' | 'md' | 'lg';
  /** Backdrop click closes the dialog. Leave off for forms. */
  dismissOnBackdrop?: boolean;
  /** CSS selector (inside the dialog) to focus on open, e.g. `#cancel-button`. Defaults to the first field. */
  initialFocus?: string;
  /** Actions row, pinned under the scrolling content. */
  footer?: ReactNode;
  /** While true, Escape / backdrop / close are ignored (a request is in flight). */
  busy?: boolean;
  hideClose?: boolean;
  children?: ReactNode;
};

const WIDTH = { sm: 440, md: 580, lg: 760 } as const;
const bodyPadding = (phone: boolean) => (phone ? Space[5] : Space[6]);

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && !el.hasAttribute('disabled') && (el.offsetParent !== null || el === document.activeElement),
  );
}

/** Open dialogs, innermost last. Only the top one reacts to Escape / Tab / focus leaving. */
const openStack: string[] = [];

/**
 * Accessible modal. Hand-rolled instead of react-native-web's `Modal` because #28 needs things it
 * doesn't provide: a labelled/described `role="dialog"|"alertdialog"`, a caller-controlled initial
 * focus target, scroll lock, an exit transition honoring reduced motion and a bottom-sheet layout.
 * (RNW's Modal does trap focus and handle Escape; those parts are reimplemented here.)
 *
 * Behavior: portaled to <body>; focus moves in on open, is trapped (Tab / Shift+Tab / focus leaving)
 * and restored to the trigger on close; Escape → `onRequestClose('escape')`; background scroll is
 * locked; below 600px it becomes a bottom sheet with safe-area padding.
 */
export function Dialog({
  visible,
  onRequestClose,
  title,
  description,
  icon,
  tone = 'default',
  role = 'dialog',
  size = 'md',
  dismissOnBackdrop = false,
  initialFocus,
  footer,
  busy = false,
  hideClose = false,
  children,
}: DialogProps) {
  const theme = useTheme();
  const isDark = useIsDark();
  const fx = useInteractive();
  const reduced = useReducedMotion();
  const { isPhone } = useBreakpoint();

  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest callbacks without re-subscribing document listeners on every render.
  const requestRef = useRef<(reason: DialogCloseReason) => void>(() => {});
  useEffect(() => {
    requestRef.current = (reason) => {
      if (!busy) onRequestClose(reason);
    };
  });

  // Mount/unmount with an exit transition.
  const [rendered, setRendered] = useState(visible);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (visible) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    if (reduced) {
      setRendered(false);
      return;
    }
    setClosing(true);
    const timer = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, Motion.fast);
    return () => clearTimeout(timer);
    // `rendered` / `reduced` intentionally omitted: this reacts to `visible` flipping only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useLockScroll(rendered);

  // The trap is live only while the dialog is open. It is released the moment closing starts (not after the
  // exit animation), so a caller that moves focus on close — e.g. to a PIN box — is never fought.
  const trapActive = visible && rendered;

  // Focus in, trap, Escape, restore.
  useEffect(() => {
    if (!trapActive || typeof document === 'undefined') return;
    const returnTo = document.activeElement as HTMLElement | null;
    openStack.push(id);

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const requested = initialFocus ? panel.querySelector<HTMLElement>(initialFocus) : null;
      const body = panel.querySelector<HTMLElement>('[data-dialog-body]');
      const target = requested ?? (body ? focusables(body)[0] : undefined) ?? focusables(panel)[0] ?? panel;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || openStack[openStack.length - 1] !== id) return;
      event.preventDefault();
      event.stopPropagation();
      requestRef.current('escape');
    };
    const onFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current;
      if (!panel || openStack[openStack.length - 1] !== id) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        (focusables(panel)[0] ?? panel).focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      const index = openStack.lastIndexOf(id);
      if (index >= 0) openStack.splice(index, 1);
      // Restore focus to the trigger only if nobody else has claimed it: focus is still inside the dialog, or lost
      // (on <body>). A caller that deliberately focused something else keeps that focus.
      const panel = panelRef.current;
      const active = document.activeElement;
      const unclaimed = !active || active === document.body || (!!panel && panel.contains(active));
      if (unclaimed && returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
    };
    // Re-run only when the dialog opens or starts closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trapActive]);

  if (Platform.OS !== 'web' || !rendered || typeof document === 'undefined') return null;

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = focusables(panel);
    if (nodes.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const danger = tone === 'danger';
  // Confirmation dialogs have a title + description + actions and no body: skip the empty body and its divider.
  const hasBody = children !== undefined && children !== null && children !== false;
  const animation = (name: string, ms: number) => (reduced ? 'none' : `${name} ${ms}ms ${Motion.easing} both`);

  return createPortal(
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissOnBackdrop) requestRef.current('backdrop');
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: isPhone ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isPhone ? 0 : 24,
        background: theme.scrim,
        overscrollBehavior: 'contain',
        animation: animation(closing ? 'ap-fade-out' : 'ap-fade-in', Motion.fast),
      }}
    >
      <div
        ref={panelRef}
        className="ap-dialog-panel"
        data-phone={isPhone ? 'true' : 'false'}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: isPhone ? '100%' : WIDTH[size],
          boxSizing: 'border-box',
          overflow: 'hidden',
          outline: 'none',
          background: theme.backgroundElement,
          border: `1px solid ${theme.border}`,
          borderRadius: isPhone ? `${Radii.xl}px ${Radii.xl}px 0 0` : Radii.xl,
          paddingBottom: isPhone ? 'env(safe-area-inset-bottom, 0px)' : 0,
          boxShadow: (elevationStyle('overlay', isDark) as { boxShadow?: string }).boxShadow,
          animation: animation(closing ? (isPhone ? 'ap-sheet-out' : 'ap-pop-out') : isPhone ? 'ap-sheet-in' : 'ap-pop-in', closing ? Motion.fast : Motion.base),
        }}
      >
        <View style={[styles.header, { borderBottomColor: theme.border, borderBottomWidth: hasBody ? 1 : 0 }]}>
          {icon ? (
            <IconBubble
              icon={icon}
              size={44}
              bg={danger ? theme.dangerBg : theme.pillGreenBg}
              fg={danger ? theme.dangerText : theme.accentText}
            />
          ) : null}
          <View style={styles.headerText}>
            <Text id={titleId} role="heading" {...webProps({ 'aria-level': 2 })} style={[styles.title, { color: theme.text }]}>
              {title}
            </Text>
            {description ? (
              <Text id={descId} style={[styles.description, { color: theme.textMuted }]}>
                {description}
              </Text>
            ) : null}
          </View>
          {hideClose ? null : (
            <Pressable
              onPress={() => requestRef.current('close')}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              disabled={busy}
              style={(state) => {
                const s = pressState(state);
                return [
                  styles.close,
                  { backgroundColor: s.hovered ? theme.surfaceMuted : 'transparent' },
                  busy && styles.disabled,
                  fx.ring(theme, s),
                  fx.transition,
                ];
              }}
            >
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          )}
        </View>

        {hasBody ? (
          <div
            data-dialog-body=""
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: bodyPadding(isPhone),
            }}
          >
            {children}
          </div>
        ) : null}

        {footer ? (
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.border, backgroundColor: theme.backgroundElement },
              isPhone ? styles.footerPhone : null,
            ]}
          >
            {footer}
          </View>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingHorizontal: Space[6],
    paddingTop: Space[5],
    paddingBottom: Space[4],
    borderBottomWidth: 1,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.sans.bold, fontWeight: '700', letterSpacing: -0.2 },
  description: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.regular, marginTop: 2 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Space[3],
    paddingHorizontal: Space[6],
    paddingVertical: Space[4],
    borderTopWidth: 1,
  },
  footerPhone: { flexDirection: 'column-reverse', alignItems: 'stretch', paddingHorizontal: Space[5] },
});
