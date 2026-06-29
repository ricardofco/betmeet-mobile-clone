/**
 * Tri-state claim values: `null` means "claim absent from the JWT" and MUST be
 * treated as fail-open by every caller (domain-overview.md §6). Only an
 * explicit `true`/`false` may trigger a gate. Never coerce this to `boolean`
 * with `!!claim` or `claim === false` shortcuts that collapse `null` into a
 * meaningful value — that would silently break the fail-open guarantee.
 */
export type TriStateClaim = boolean | null;

export type AuthAssuranceLevel = 'aal1' | 'aal2';

export type AuthClaims = {
  /** Supabase user id, or `null` if there is no authenticated session. */
  sub: string | null;
  emailVerified: TriStateClaim;
  onboardingCompleted: TriStateClaim;
  accountDeleted: TriStateClaim;
  /** Present only when the user has an MFA factor; absent (`null`) otherwise. */
  aal: { current: AuthAssuranceLevel; next: AuthAssuranceLevel } | null;
};

export type AuthSession = {
  claims: AuthClaims;
  accessToken: string | null;
  refreshToken: string | null;
};

export const UNAUTHENTICATED_CLAIMS: AuthClaims = {
  sub: null,
  emailVerified: null,
  onboardingCompleted: null,
  accountDeleted: null,
  aal: null,
};

export function isAuthenticated(claims: AuthClaims): boolean {
  return typeof claims.sub === 'string';
}

/** True only when the claim is explicitly `true` — never true on `null`. */
export function isExplicitlyTrue(claim: TriStateClaim): boolean {
  return claim === true;
}

/** True only when the claim is explicitly `false` — never true on `null`. */
export function isExplicitlyFalse(claim: TriStateClaim): boolean {
  return claim === false;
}
