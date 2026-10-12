import { useEffect, useState } from 'react';

import {
  MINUTE,
  countdownAnnouncement,
  formatExpiry,
  formatRemaining,
} from '@/utils/clinician-format';

export type SessionCountdown = {
  remainingMs: number;
  /** "23 h 41 min", or "4:32" during the final five minutes. */
  label: string;
  /** "Expires today at 14:32". */
  expiryText: string;
  /** Non-null only inside the 10 / 5 / 1 minute and expiry windows (see `countdownAnnouncement`). */
  announcement: string | null;
  /** True once less than 10 minutes are left (UI turns the chip to a warning). */
  urgent: boolean;
};

/**
 * Countdown derived from `Date.parse(expiresAt) - Date.now()` on every tick — never a decrementing
 * counter — so a laptop that slept shows the right value on wake. Ticks once a minute (aligned to the
 * minute boundary) and once a second in the last five minutes; also re-checks on tab visibility / focus.
 */
export function useSessionCountdown(expiresAt?: string): SessionCountdown {
  const target = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      const left = target - current;
      if (left <= 0) return;
      const delay = left > 5 * MINUTE ? (left % MINUTE || MINUTE) + 25 : (left % 1000 || 1000) + 25;
      timer = setTimeout(tick, delay);
    };
    tick();

    const refresh = () => {
      if (timer) clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [target]);

  const remainingMs = Number.isNaN(target) ? 0 : Math.max(0, target - now);
  return {
    remainingMs,
    label: Number.isNaN(target) ? '' : formatRemaining(remainingMs),
    expiryText: Number.isNaN(target) ? '' : formatExpiry(new Date(target), new Date(now)),
    announcement: Number.isNaN(target) ? null : countdownAnnouncement(remainingMs),
    urgent: !Number.isNaN(target) && remainingMs <= 10 * MINUTE,
  };
}
