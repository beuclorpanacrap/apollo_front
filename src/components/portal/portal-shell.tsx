import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

import { AppMark } from '@/components/app-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ScrollLockProvider, useScrollLocked } from '@/components/ui/scroll-lock';
import { ToastProvider } from '@/components/ui/toast';
import { Fonts, Layout, Radii, Space, elevationStyle } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useClinicianVault } from '@/context/clinician-vault-context';
import { useThemeContext } from '@/context/theme-context';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useThemeCssVars } from '@/hooks/use-theme-css-vars';
import { DOCTOR_ROLE_LABELS, initialsOf, isDoctorRole } from '@/utils/clinician-format';
import { clinicianSignInHref } from '@/utils/portal-routes';
import { webProps, webStyle } from '@/utils/web-props';

type NavTarget = '/doctor' | '/doctor-profile';
type ActivePage = 'dashboard' | 'profile' | 'public';

type PortalActions = {
  /** Opens the styled "Sign out?" confirmation (replaces `window.confirm`). */
  requestSignOut: () => void;
};
const PortalActionsContext = createContext<PortalActions>({ requestSignOut: () => {} });
export const usePortalActions = () => useContext(PortalActionsContext);

const NavLockContext = createContext<(locked: boolean) => void>(() => {});
/**
 * Pages call this while an irreversible request (the single-use PIN) is in flight so the header can't
 * navigate away mid-request. Released automatically on unmount.
 */
export function useNavLock(locked: boolean) {
  const setLocked = useContext(NavLockContext);
  useEffect(() => {
    setLocked(locked);
    return () => setLocked(false);
  }, [locked, setLocked]);
}

type PortalShellProps = {
  active: ActivePage;
  /** Document title. Never put patient names or other PHI here: tab titles end up in history/screenshots. */
  title: string;
  /** Disables navigation while an irreversible request (single-use PIN) is in flight. */
  navLocked?: boolean;
  /** Marks <main> as busy while the page loads. */
  busy?: boolean;
  /** Auth still resolving: the header shows only the brand (no flash of "Clinician sign in"). */
  loading?: boolean;
  children: ReactNode;
};

/**
 * Frame for every clinician page: skip link, `<header>` with `<nav aria-label="Clinician">`, `<main id="main">`,
 * theme → CSS variable sync, toasts, scroll lock and the sign-out confirmation. Header content and page
 * content share one centered column (`Layout.contentMaxWidth`) and one gutter so their edges align.
 */
export function PortalShell({ active, title, navLocked = false, busy = false, loading = false, children }: PortalShellProps) {
  useThemeCssVars();
  const { theme } = useThemeContext();
  const [childLock, setChildLock] = useState(false);

  return (
    <ToastProvider>
      <ScrollLockProvider>
        <Head>
          <title>{title}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <NavLockContext.Provider value={setChildLock}>
          <ShellFrame active={active} navLocked={navLocked || childLock} busy={busy || loading} loading={loading} background={theme.background}>
            {children}
          </ShellFrame>
        </NavLockContext.Provider>
      </ScrollLockProvider>
    </ToastProvider>
  );
}

function useGutter() {
  const { width, isPhone } = useBreakpoint();
  return isPhone ? Space[4] : width < Layout.tablet ? Space[6] : Space[7];
}

function ShellFrame({
  active,
  navLocked,
  busy,
  loading,
  background,
  children,
}: {
  active: ActivePage;
  navLocked: boolean;
  busy: boolean;
  loading: boolean;
  background: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const { close } = useClinicianVault();
  const locked = useScrollLocked();
  const gutter = useGutter();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const requestSignOut = useCallback(() => setConfirming(true), []);
  const actions = useMemo(() => ({ requestSignOut }), [requestSignOut]);

  const signOut = async () => {
    setSigningOut(true);
    close(); // PHI never outlives the session
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setConfirming(false);
      router.replace('/welcome');
    }
  };

  return (
    <PortalActionsContext.Provider value={actions}>
      <View style={[styles.root, { backgroundColor: background }]}>
        <SkipLink />
        <PortalHeader active={active} navLocked={navLocked} loading={loading} gutter={gutter} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!locked}
          keyboardShouldPersistTaps="handled"
        >
          <View
            role="main"
            id="main"
            aria-busy={busy || undefined}
            {...webProps({ tabIndex: -1 })}
            style={[styles.main, { paddingHorizontal: gutter }, webStyle({ outlineStyle: 'none' })]}
          >
            {children}
          </View>
        </ScrollView>
      </View>

      <Dialog
        visible={confirming}
        role="alertdialog"
        size="sm"
        icon="log-out-outline"
        title="Sign out of Apollo?"
        description="Any open patient vault will be closed. You’ll need a new PIN to open it again."
        initialFocus="#signout-cancel"
        busy={signingOut}
        onRequestClose={() => setConfirming(false)}
        footer={
          <>
            <Button id="signout-cancel" label="Stay signed in" variant="ghost" portal size="compact" disabled={signingOut} onPress={() => setConfirming(false)} />
            <Button label="Sign out" variant="danger" portal size="compact" icon="log-out-outline" loading={signingOut} onPress={signOut} />
          </>
        }
      />
    </PortalActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------------------------
// Skip link
// ---------------------------------------------------------------------------------------------

function SkipLink() {
  const { theme } = useThemeContext();
  const onClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById('main');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView({ block: 'start' });
  };
  return (
    <a
      href="#main"
      className="ap-skip"
      onClick={onClick}
      style={{ background: theme.tintStrong, color: theme.onTint, fontFamily: Fonts.sans.bold, fontSize: 14 }}
    >
      Skip to main content
    </a>
  );
}

// ---------------------------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------------------------

const NAV: { key: Exclude<ActivePage, 'public'>; label: string; href: NavTarget; icon: 'grid-outline' | 'person-outline' }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/doctor', icon: 'grid-outline' },
  { key: 'profile', label: 'Profile', href: '/doctor-profile', icon: 'person-outline' },
];

function PortalHeader({ active, navLocked, loading, gutter }: { active: ActivePage; navLocked: boolean; loading: boolean; gutter: number }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { theme, isDark, setThemeMode } = useThemeContext();
  const { isCompactNav, isPhone } = useBreakpoint();
  const { requestSignOut } = usePortalActions();
  const isPublic = active === 'public' || !isAuthenticated;

  const go = (event: ReactMouseEvent, href: NavTarget) => {
    // Let the browser handle modified clicks (open in new tab); intercept plain clicks for client routing.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navLocked || active === NAV.find((item) => item.href === href)?.key) return;
    router.push(href);
  };

  const toggleTheme = () => setThemeMode(isDark ? 'Light' : 'Dark');
  const doctorRole = isDoctorRole(user?.doctorRole) ? user?.doctorRole : undefined;

  return (
    <header
      style={{
        position: 'relative',
        zIndex: 20,
        flexShrink: 0,
        background: theme.backgroundElement,
        borderBottom: `1px solid ${theme.border}`,
        boxShadow: (elevationStyle('card', isDark) as { boxShadow?: string }).boxShadow,
      }}
    >
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: Layout.contentMaxWidth,
          margin: '0 auto',
          height: isPhone ? 60 : Layout.headerHeight,
          padding: `0 ${gutter}px`,
          display: 'flex',
          alignItems: 'center',
          gap: Space[4],
        }}
      >
        <a
          href={isPublic ? '/welcome' : '/doctor'}
          className="ap-reset ap-focus"
          aria-label="Apollo clinicians"
          onClick={(event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (navLocked) return;
            if (isPublic) router.push('/welcome');
            else if (active !== 'dashboard') router.push('/doctor');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, flexShrink: 0 }}
        >
          <AppMark size={isPhone ? 30 : 34} />
          <span style={{ fontFamily: Fonts.display, fontWeight: 800, fontSize: isPhone ? 20 : 22, letterSpacing: -0.5, color: theme.text }}>Apollo</span>
          <span
            style={{
              display: isPhone ? 'none' : 'inline',
              paddingLeft: 12,
              marginLeft: 2,
              borderLeft: `1px solid ${theme.border}`,
              fontFamily: Fonts.sans.medium,
              fontWeight: 500,
              fontSize: 14,
              color: theme.textMuted,
            }}
          >
            Clinicians
          </span>
        </a>

        {!loading && !isPublic && !isCompactNav ? (
          <nav aria-label="Clinician" style={{ display: 'flex', gap: 4, marginLeft: Space[3] }}>
            {NAV.map((item) => {
              const current = item.key === active;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  className="ap-reset ap-hoverable ap-focus"
                  aria-current={current ? 'page' : undefined}
                  aria-disabled={navLocked && !current ? true : undefined}
                  onClick={(event) => go(event, item.href)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 40,
                    padding: '0 14px',
                    borderRadius: Radii.md,
                    fontFamily: Fonts.sans.semiBold,
                    fontWeight: 600,
                    fontSize: 14,
                    color: current ? theme.accentText : theme.textMuted,
                    background: current ? theme.pillGreenBg : undefined,
                  }}
                >
                  <Ionicons name={item.icon} size={17} color={current ? theme.accentText : theme.textMuted} />
                  {item.label}
                </a>
              );
            })}
          </nav>
        ) : null}

        <div style={{ flex: 1 }} />

        {loading ? null : isPublic ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: Space[2] }}>
            <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} icon={isDark ? 'sunny-outline' : 'moon-outline'} onClick={toggleTheme} />
            <a
              href="/sign-in?portal=clinician"
              className="ap-reset ap-hoverable ap-focus"
              onClick={(event) => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                router.push(clinicianSignInHref());
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 40,
                padding: '0 14px',
                borderRadius: Radii.md,
                fontFamily: Fonts.sans.semiBold,
                fontWeight: 600,
                fontSize: 14,
                color: theme.accentText,
              }}
            >
              Clinician sign in
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: Space[2] }}>
            {doctorRole && !isCompactNav ? (
              <Badge size="md" style={{ alignSelf: 'center' }} label={DOCTOR_ROLE_LABELS[doctorRole]} icon="medkit-outline" bg={theme.pillGreenBg} fg={theme.pillGreenText} />
            ) : null}
            {!isCompactNav ? (
              <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} icon={isDark ? 'sunny-outline' : 'moon-outline'} onClick={toggleTheme} />
            ) : null}
            <AccountMenu
              compact={isCompactNav}
              active={active}
              navLocked={navLocked}
              onNavigate={(href) => router.push(href)}
              onToggleTheme={toggleTheme}
              onSignOut={requestSignOut}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  size = 40,
}: {
  label: string;
  icon: 'sunny-outline' | 'moon-outline';
  onClick: () => void;
  size?: number;
}) {
  const { theme } = useThemeContext();
  return (
    <button
      type="button"
      className="ap-reset ap-hoverable ap-focus"
      aria-label={label}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.md,
      }}
    >
      <Ionicons name={icon} size={20} color={theme.textMuted} />
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Account menu (desktop avatar menu / compact hamburger menu)
// ---------------------------------------------------------------------------------------------

type MenuEntry = {
  key: string;
  label: string;
  icon: 'grid-outline' | 'person-outline' | 'sunny-outline' | 'moon-outline' | 'log-out-outline';
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  current?: boolean;
};

function AccountMenu({
  compact,
  active,
  navLocked,
  onNavigate,
  onToggleTheme,
  onSignOut,
}: {
  compact: boolean;
  active: ActivePage;
  navLocked: boolean;
  onNavigate: (href: NavTarget) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const { user } = useAuth();
  const { theme, isDark } = useThemeContext();
  const { isPhone } = useBreakpoint();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const entries: MenuEntry[] = [
    ...(compact
      ? NAV.map<MenuEntry>((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          current: item.key === active,
          disabled: navLocked && item.key !== active,
          onSelect: () => item.key !== active && onNavigate(item.href),
        }))
      : [
          {
            key: 'profile',
            label: 'Profile',
            icon: 'person-outline' as const,
            current: active === 'profile',
            disabled: navLocked && active !== 'profile',
            onSelect: () => active !== 'profile' && onNavigate('/doctor-profile'),
          },
        ]),
    ...(compact
      ? [
          {
            key: 'theme',
            label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
            icon: isDark ? ('sunny-outline' as const) : ('moon-outline' as const),
            onSelect: onToggleTheme,
          },
        ]
      : []),
    { key: 'signout', label: 'Sign out', icon: 'log-out-outline', danger: true, onSelect: onSignOut },
  ];

  const focusItem = (index: number) => {
    const enabled = items.current.filter((node): node is HTMLButtonElement => !!node && !node.disabled);
    if (!enabled.length) return;
    const target = ((index % enabled.length) + enabled.length) % enabled.length;
    enabled[target].focus();
  };
  const indexOfFocused = () => items.current.filter((node): node is HTMLButtonElement => !!node && !node.disabled).findIndex((node) => node === document.activeElement);

  const closeMenu = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => trigger.current?.focus());
  };

  // Click outside closes.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapper.current && event.target instanceof Node && !wrapper.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(event.key === 'ArrowUp' ? -1 : 0));
    }
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(indexOfFocused() + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(indexOfFocused() - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(-1);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const name = user?.fullName || 'Doctor';

  // Escape closes the menu from the trigger as well as from inside it (mouse-opened menus keep focus on the trigger).
  const onWrapperKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
  };

  return (
    <div ref={wrapper} style={{ position: 'relative' }} onKeyDown={onWrapperKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="ap-reset ap-hoverable ap-focus"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={compact ? 'Open menu' : `Account menu for ${name}`}
        onClick={(event) => {
          const opening = !open;
          setOpen(opening);
          // `detail === 0` marks a keyboard-initiated click (Enter / Space): move into the menu.
          // Mouse users keep focus on the trigger.
          if (opening && event.detail === 0) requestAnimationFrame(() => focusItem(0));
        }}
        onKeyDown={onTriggerKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: compact ? 44 : 44,
          minWidth: 44,
          padding: compact ? '0 10px' : '0 8px 0 4px',
          borderRadius: compact ? Radii.md : Radii.pill,
          justifyContent: 'center',
        }}
      >
        {compact ? (
          <Ionicons name={open ? 'close' : 'menu'} size={24} color={theme.text} />
        ) : (
          <>
            <span
              aria-hidden
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme.pillGreenBg,
                color: theme.accentText,
                fontFamily: Fonts.sans.bold,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {initialsOf(user?.fullName, 'Dr')}
            </span>
            <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
          </>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          className="ap-enter ap-enter-pop"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            zIndex: 30,
            width: isPhone ? 'min(320px, calc(100vw - 32px))' : 296,
            boxSizing: 'border-box',
            padding: 8,
            background: theme.backgroundElement,
            border: `1px solid ${theme.border}`,
            borderRadius: Radii.lg,
            boxShadow: (elevationStyle('raised', isDark) as { boxShadow?: string }).boxShadow,
            transformOrigin: 'top right',
          }}
        >
          <div style={{ padding: '10px 12px 12px', borderBottom: `1px solid ${theme.border}`, marginBottom: 6 }}>
            <div style={{ fontFamily: Fonts.sans.bold, fontWeight: 700, fontSize: 15, color: theme.text, overflowWrap: 'anywhere' }}>{name}</div>
            {user?.email ? (
              <div style={{ fontFamily: Fonts.sans.regular, fontSize: 13, lineHeight: '18px', color: theme.textMuted, overflowWrap: 'anywhere' }}>{user.email}</div>
            ) : null}
            {compact && isDoctorRole(user?.doctorRole) ? (
              <div style={{ marginTop: 8, display: 'flex' }}>
                <Badge size="md" label={DOCTOR_ROLE_LABELS[user.doctorRole as keyof typeof DOCTOR_ROLE_LABELS]} icon="medkit-outline" bg={theme.pillGreenBg} fg={theme.pillGreenText} />
              </div>
            ) : null}
          </div>
          <div role="menu" aria-label="Account" onKeyDown={onMenuKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {entries.map((entry, index) => (
              <button
                key={entry.key}
                ref={(node) => {
                  items.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={entry.disabled}
                aria-current={entry.current ? 'page' : undefined}
                className="ap-reset ap-hoverable ap-menuitem"
                onClick={() => {
                  setOpen(false);
                  // The item is about to unmount: park focus on the trigger first, so a dialog this action
                  // opens restores focus somewhere real when it closes.
                  trigger.current?.focus();
                  entry.onSelect();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  minHeight: 44,
                  padding: '0 12px',
                  borderRadius: Radii.sm + 2,
                  fontFamily: Fonts.sans.semiBold,
                  fontWeight: 600,
                  fontSize: 14,
                  color: entry.danger ? theme.dangerText : entry.current ? theme.accentText : theme.text,
                  opacity: entry.disabled ? 0.5 : 1,
                  cursor: entry.disabled ? 'default' : 'pointer',
                }}
              >
                <Ionicons name={entry.icon} size={18} color={entry.danger ? theme.dangerText : entry.current ? theme.accentText : theme.textMuted} />
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  main: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    flexGrow: 1,
    paddingTop: Space[7],
    paddingBottom: Space[10],
  },
});
