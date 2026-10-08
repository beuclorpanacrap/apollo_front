import type { Href } from 'expo-router';

/**
 * The only post-sign-in return targets we honor. Exact matches only: this is an allow-list so a
 * crafted `?next=` can never become an open redirect.
 */
export const PORTAL_ROUTES = ['/doctor', '/doctor-profile'] as const;
export type PortalRoute = (typeof PORTAL_ROUTES)[number];

export function safePortalNext(value: unknown): PortalRoute | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && (PORTAL_ROUTES as readonly string[]).includes(raw) ? (raw as PortalRoute) : null;
}

/** Clinician sign-in, optionally remembering which portal page the person was heading to. */
export function clinicianSignInHref(next?: string | null): Href {
  const safe = safePortalNext(next ?? undefined);
  return safe
    ? { pathname: '/sign-in', params: { portal: 'clinician', next: safe } }
    : { pathname: '/sign-in', params: { portal: 'clinician' } };
}

/** First path segments that belong to the clinician portal (used by RouteGuard and the web frame). */
export const PORTAL_SEGMENTS = ['doctor', 'doctor-vault', 'doctor-profile'] as const;
export function isPortalSegment(segment: string | undefined): boolean {
  return !!segment && (PORTAL_SEGMENTS as readonly string[]).includes(segment);
}
