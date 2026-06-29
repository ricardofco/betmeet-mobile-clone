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
  | { type: 'redirect'; to: 'home' }
  | { type: 'redirect'; to: 'onboarding'; rememberDestination: Destination }
  | { type: 'proceed' };

/**
 * `claims.aal` recognizes the pending-MFA state distinctly (current `aal1`,
 * next `aal2`) so rule 4's exception can let it through — even though MFA
 * itself (AUTH-3) is out of this bolt's scope, the guard must not bounce it.
 */
function isPendingMfa(claims: AuthClaims): boolean {
  return claims.aal !== null && claims.aal.current === 'aal1' && claims.aal.next === 'aal2';
}

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

  // Rule 4: an authenticated+confirmed user on an auth-only screen is
  // redirected to home — unless they have a pending MFA challenge, in which
  // case they're let through to complete it.
  if (hasScreenClass(currentScreenClass, 'auth-only')) {
    if (isPendingMfa(claims)) {
      return { type: 'proceed' };
    }
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
