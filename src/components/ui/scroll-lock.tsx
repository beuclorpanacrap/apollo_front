import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ScrollLockApi = { lock: () => () => void };

const ScrollLockContext = createContext<ScrollLockApi>({ lock: () => () => {} });
const LockedContext = createContext(false);

/**
 * Counts open overlays. The shell reads `useScrollLocked()` to switch its scroll container off, and
 * restores it when the last overlay closes (nested dialogs are counted, so closing the inner one
 * doesn't unlock the page).
 */
export function ScrollLockProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const lock = useCallback(() => {
    setCount((value) => value + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCount((value) => Math.max(0, value - 1));
    };
  }, []);
  const api = useMemo(() => ({ lock }), [lock]);
  return (
    <ScrollLockContext.Provider value={api}>
      <LockedContext.Provider value={count > 0}>{children}</LockedContext.Provider>
    </ScrollLockContext.Provider>
  );
}

/** True while at least one overlay is open. */
export function useScrollLocked(): boolean {
  return useContext(LockedContext);
}

/** Hold a scroll lock while `active`. */
export function useLockScroll(active: boolean) {
  const { lock } = useContext(ScrollLockContext);
  useEffect(() => {
    if (!active) return;
    return lock();
  }, [active, lock]);
}
