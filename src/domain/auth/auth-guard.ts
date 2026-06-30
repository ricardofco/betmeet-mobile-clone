import type { AuthClaims } from '@/domain/auth/auth-claims';
import { isAuthenticated, isExplicitlyFalse, isExplicitlyTrue } from '@/domain/auth/auth-claims';
import { hasScreenClass, type ScreenClass } from '@/domain/auth/screen-class';

/**
 * The single, central gate AUTH-7 requires — a pure function of the current
 * session's claims, the screen the user is trying to reach, and (where
 * relevant) the destination to remember. Reproduces domain-overview.md §6 /
 * AUTH-7's six rules **verbatim and in the exact order given**, first match
 * wins. See model.md §1 for the full rule text and the decision table this
 * implementation is verified against (Test stage).
 *
 * Bolt 2 extension (ADR-008): new rule 3.5 — pending-MFA redirect inserted
 * between the unconfirmed-email check (rule 3) and the auth-only redirect
 * (rule 4). The Bolt 1 `isPendingMfa` helper in rule 4 is removed now that
 * the guard handles the pending-MFA case with an explicit branch before
 * rule 4 is reached.
 */

export type Destination = {
  screenClass: ScreenClass;
  route: string;
  params?: unknown;
};

export type GuardOutcome =
  | { type: 'eject' }
  | { type: 'redirect'; to: 'sign-in'; rememberDestination: Destination }
  | { type: 'redirect'; to: 'verify-email' }
  | { type: 'redirect'; to: 'mfa-challenge' }
  | { type: 'redirect'; to: 'home' }
  | { type: 'redirect'; to: 'onboarding'; rememberDestination: Destination }
  | { type: 'proceed' };

export function evaluateGuard(
  claims: AuthClaims,
  currentScreenClass: ScreenClass,
  intendedDestination: Destination,
): GuardOutcome {
  // Rule 1: a session whose `account_deleted` claim is explicitly `true` is
  // ejected, even if the JWT itself still cryptographically verifies.
  if (isExplicitlyTrue(claims.accountDeleted)) {
    return { type: 'eject' };
  }

  const authenticated = isAuthenticated(claims);

  // Rule 2: an unauthenticated user may only reach public screens; everything
  // else routes to sign-in, remembering the originally intended destination.
  if (!authenticated) {
    if (hasScreenClass(currentScreenClass, 'public')) {
      return { type: 'proceed' };
    }
    return { type: 'redirect', to: 'sign-in', rememberDestination: intendedDestination };
  }

  // Rule 3: an authenticated-but-unconfirmed-email user (explicit-false only)
  // is forced to "verify your email", with public screens (incl. any
  // confirmation continuation screen) still reachable.
  if (isExplicitlyFalse(claims.emailVerified)) {
    if (hasScreenClass(currentScreenClass, 'public') || hasScreenClass(currentScreenClass, 'verify-email')) {
      return { type: 'proceed' };
    }
    return { type: 'redirect', to: 'verify-email' };
  }

  // Rule 3.5 (Bolt 2, ADR-008): an authenticated+confirmed user with a
  // pending MFA challenge (aal1 session, aal2 required) must complete MFA
  // before accessing the app. Only `mfa-challenge`-classed screens are
  // reachable in this state.
  if (claims.aal?.current === 'aal1' && claims.aal?.next === 'aal2') {
    if (hasScreenClass(currentScreenClass, 'mfa-challenge')) {
      return { type: 'proceed' };
    }
    return { type: 'redirect', to: 'mfa-challenge' };
  }

  // Rule 4: an authenticated+confirmed user on an auth-only screen is
  // redirected to home (the pending-MFA exception from Bolt 1 is now
  // handled by rule 3.5 above — this rule is clean again).
  if (hasScreenClass(currentScreenClass, 'auth-only')) {
    return { type: 'redirect', to: 'home' };
  }

  // Rule 5: an authenticated+confirmed user who hasn't finished onboarding
  // (explicit-false only) is redirected to onboarding from anywhere else,
  // carrying the original intended destination.
  if (isExplicitlyFalse(claims.onboardingCompleted)) {
    if (hasScreenClass(currentScreenClass, 'onboarding')) {
      return { type: 'proceed' };
    }
    return { type: 'redirect', to: 'onboarding', rememberDestination: intendedDestination };
  }

  // Rule 6: otherwise, proceed.
  return { type: 'proceed' };
}
