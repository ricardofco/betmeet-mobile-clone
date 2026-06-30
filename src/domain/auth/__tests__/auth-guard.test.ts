import { type AuthClaims, UNAUTHENTICATED_CLAIMS } from '@/domain/auth/auth-claims';
import { evaluateGuard, type Destination, type GuardOutcome } from '@/domain/auth/auth-guard';
import type { ScreenClass } from '@/domain/auth/screen-class';
import { screenClassFor } from '@/host/auth/navigation/screen-registry';

/**
 * AUTH-7's AC: "a table of claim combinations ... is written out and
 * verified against, not just spot-checked." This file is that table,
 * encoded as parametrized cases, reproducing model.md §1's decision table
 * exactly (including the fail-open ∅/explicit-false collapsing
 * `model.md` itself calls out), updated for:
 *   - ADR-004: tag-array `ScreenClass` refinement (membership checks, not equality)
 *   - ADR-008 (Bolt 2): rule 3.5 — pending-MFA redirect inserted between
 *     rules 3 and 4; `isPendingMfa` exception removed from rule 4.
 */

const homeDestination: Destination = { screenClass: screenClassFor('Home'), route: 'Home' };

function destinationFor(screenClass: ScreenClass): Destination {
  return { screenClass, route: 'test-route' };
}

function authenticatedClaims(overrides: Partial<AuthClaims> = {}): AuthClaims {
  return { sub: 'user-123', emailVerified: null, onboardingCompleted: null, accountDeleted: null, aal: null, ...overrides };
}

const PENDING_MFA: AuthClaims['aal'] = { current: 'aal1', next: 'aal2' };
const NOT_PENDING_MFA: AuthClaims['aal'] = { current: 'aal2', next: 'aal2' };

describe('evaluateGuard — AUTH-7 decision table (model.md §1, verbatim rule order)', () => {
  // Row 1: accountDeleted explicitly true ejects, regardless of every other claim/screen.
  it.each<[string, ScreenClass]>([
    ['public', ['public']],
    ['auth-only', ['auth-only']],
    ['verify-email', ['verify-email']],
    ['onboarding', ['onboarding']],
    ['protected', ['protected']],
  ])('row 1: accountDeleted=true ejects regardless of screen class (%s)', (_label, screenClass) => {
    const claims = authenticatedClaims({ accountDeleted: true, emailVerified: true, onboardingCompleted: true });
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'eject' });
  });

  it('row 1: accountDeleted=true ejects even with a pending MFA challenge', () => {
    const claims = authenticatedClaims({ accountDeleted: true, aal: PENDING_MFA });
    const outcome = evaluateGuard(claims, ['auth-only'], destinationFor(['auth-only']));
    expect(outcome).toEqual<GuardOutcome>({ type: 'eject' });
  });

  it('row 1 (fail-open contrast): accountDeleted=false does NOT eject', () => {
    const claims = authenticatedClaims({ accountDeleted: false, emailVerified: true, onboardingCompleted: true });
    const outcome = evaluateGuard(claims, ['protected'], homeDestination);
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it('row 1 (fail-open contrast): accountDeleted=null (absent) does NOT eject', () => {
    const claims = authenticatedClaims({ accountDeleted: null, emailVerified: true, onboardingCompleted: true });
    const outcome = evaluateGuard(claims, ['protected'], homeDestination);
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  // Row 2: unauthenticated user — public screens proceed, everything else -> sign-in, remembering destination.
  it('row 2: unauthenticated + public screen -> proceed', () => {
    const outcome = evaluateGuard(UNAUTHENTICATED_CLAIMS, ['public'], destinationFor(['public']));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it.each<[string, ScreenClass]>([
    ['auth-only (not also public)', ['auth-only']],
    ['verify-email (not also public)', ['verify-email']],
    ['onboarding', ['onboarding']],
    ['protected', ['protected']],
  ])('row 2: unauthenticated + %s -> redirect sign-in, remembering destination', (_label, screenClass) => {
    const destination = destinationFor(screenClass);
    const outcome = evaluateGuard(UNAUTHENTICATED_CLAIMS, screenClass, destination);
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'sign-in', rememberDestination: destination });
  });

  it('row 2: a screen tagged both public and auth-only is still reachable while unauthenticated (sign-in itself)', () => {
    const screenClass = screenClassFor('SignIn');
    const outcome = evaluateGuard(UNAUTHENTICATED_CLAIMS, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  // Row 3: authenticated + emailVerified explicitly false -> verify-email, except public/verify-email screens.
  it.each<[string, ScreenClass]>([
    ['public', ['public']],
    ['verify-email', ['verify-email']],
  ])('row 3: authenticated + emailVerified=false + %s -> proceed', (_label, screenClass) => {
    const claims = authenticatedClaims({ emailVerified: false });
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it.each<[string, ScreenClass]>([
    ['auth-only (not public/verify-email)', ['auth-only']],
    ['onboarding', ['onboarding']],
    ['protected', ['protected']],
  ])('row 3: authenticated + emailVerified=false + %s -> redirect verify-email', (_label, screenClass) => {
    const claims = authenticatedClaims({ emailVerified: false });
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'verify-email' });
  });

  it('row 3: the real VerifyEmail screen class (public+verify-email+auth-only) proceeds for an unconfirmed user', () => {
    const claims = authenticatedClaims({ emailVerified: false });
    const screenClass = screenClassFor('VerifyEmail');
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  // Row 3.5 (Bolt 2, ADR-008): pending MFA — authenticated+confirmed, aal1 with aal2 required.
  // Inserted before rule 4; only 'mfa-challenge'-tagged screens are reachable.
  it('row 3.5: authenticated+confirmed + pending MFA (aal1/aal2) + mfa-challenge screen -> proceed', () => {
    const claims = authenticatedClaims({ emailVerified: true, aal: PENDING_MFA });
    const screenClass = screenClassFor('MfaChallenge');
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it.each<[string, ScreenClass]>([
    ['auth-only', ['auth-only']],
    ['protected', ['protected']],
    ['onboarding', ['onboarding']],
    ['public (not mfa-challenge)', ['public']],
  ])(
    'row 3.5: authenticated+confirmed + pending MFA + %s -> redirect mfa-challenge',
    (_label, screenClass) => {
      const claims = authenticatedClaims({ emailVerified: true, aal: PENDING_MFA });
      const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
      expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'mfa-challenge' });
    },
  );

  it('row 3.5: emailVerified=null (absent, fail-open) + pending MFA -> redirect mfa-challenge', () => {
    // fail-open: emailVerified=null is NOT explicitly false, so rule 3 does
    // not fire. Rule 3.5 fires next.
    const claims = authenticatedClaims({ emailVerified: null, aal: PENDING_MFA });
    const outcome = evaluateGuard(claims, ['auth-only'], destinationFor(['auth-only']));
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'mfa-challenge' });
  });

  it('row 3.5: aal current=aal2/next=aal2 (not pending) does NOT trigger mfa-challenge redirect', () => {
    const claims = authenticatedClaims({ emailVerified: true, aal: NOT_PENDING_MFA });
    const outcome = evaluateGuard(claims, ['auth-only'], destinationFor(['auth-only']));
    // Not pending MFA -> rule 3.5 skipped -> rule 4 fires -> redirect home
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'home' });
  });

  // Row 4: authenticated+confirmed on an auth-only screen -> home.
  // (The Bolt 1 pending-MFA exception in rule 4 is removed — ADR-008.
  //  Pending-MFA is now handled by rule 3.5 before rule 4 is reached.)
  it('row 4: authenticated+confirmed + auth-only screen + no pending MFA -> redirect home', () => {
    const claims = authenticatedClaims({ emailVerified: true });
    const outcome = evaluateGuard(claims, ['auth-only'], destinationFor(['auth-only']));
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'home' });
  });

  it('row 4 (fail-open contrast): emailVerified=null (absent) + confirmed-equivalent + auth-only -> redirect home', () => {
    const claims = authenticatedClaims({ emailVerified: null });
    const outcome = evaluateGuard(claims, ['auth-only'], destinationFor(['auth-only']));
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'home' });
  });

  // Row 5: authenticated+confirmed, onboardingCompleted explicitly false -> onboarding, except onboarding screen itself.
  it('row 5: authenticated+confirmed + onboardingCompleted=false + onboarding screen -> proceed', () => {
    const claims = authenticatedClaims({ emailVerified: true, onboardingCompleted: false });
    const screenClass = screenClassFor('OnboardingNickname');
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it.each<[string, ScreenClass]>([
    ['public (not auth-only)', ['public']],
    ['verify-email (not auth-only)', ['verify-email']],
    ['protected', ['protected']],
  ])(
    'row 5: authenticated+confirmed + onboardingCompleted=false + %s -> redirect onboarding, remembering destination',
    (_label, screenClass) => {
      const claims = authenticatedClaims({ emailVerified: true, onboardingCompleted: false });
      const destination = destinationFor(screenClass);
      const outcome = evaluateGuard(claims, screenClass, destination);
      expect(outcome).toEqual<GuardOutcome>({
        type: 'redirect',
        to: 'onboarding',
        rememberDestination: destination,
      });
    },
  );

  it('row 5: an auth-only screen still resolves via rule 4 first, never reaching rule 5 (rule order matters)', () => {
    // A confirmed user with onboardingCompleted=false on an auth-only screen
    // is caught by rule 4 (redirect home), not rule 5 — rule 4 is strictly
    // earlier in AUTH-7's ordering. This locks in "first match wins."
    const claims = authenticatedClaims({ emailVerified: true, onboardingCompleted: false });
    const outcome = evaluateGuard(claims, ['auth-only'], destinationFor(['auth-only']));
    expect(outcome).toEqual<GuardOutcome>({ type: 'redirect', to: 'home' });
  });

  // Row 6 (rule 6, "otherwise proceed"): fully resolved, confirmed, onboarded user on a protected screen.
  it('row 6: authenticated+confirmed+onboarded + protected screen -> proceed', () => {
    const claims = authenticatedClaims({ emailVerified: true, onboardingCompleted: true });
    const outcome = evaluateGuard(claims, ['protected'], homeDestination);
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it('row 6 (fail-open): authenticated, both emailVerified and onboardingCompleted absent (null) -> proceed', () => {
    const claims = authenticatedClaims({ emailVerified: null, onboardingCompleted: null });
    const outcome = evaluateGuard(claims, ['protected'], homeDestination);
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  // Row 10/11 equivalents: an already-onboarded, confirmed user can still reach
  // a public-but-not-auth-only screen, and can reach the onboarding screen
  // class directly — nothing in rules 1-5 redirects them away from either.
  it('row 10: confirmed+onboarded user on ForgotPassword (public+auth-only) -> redirect home via rule 4', () => {
    const claims = authenticatedClaims({ emailVerified: true, onboardingCompleted: true });
    const screenClass = screenClassFor('ForgotPassword'); // public + auth-only
    const outcomeRegistryScreen = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    // public-only (hypothetical) -> proceed
    const publicOnly: ScreenClass = ['public'];
    const outcomePublicOnly = evaluateGuard(claims, publicOnly, destinationFor(publicOnly));
    expect(outcomeRegistryScreen).toEqual<GuardOutcome>({ type: 'redirect', to: 'home' });
    expect(outcomePublicOnly).toEqual<GuardOutcome>({ type: 'proceed' });
  });

  it('row 11: confirmed+onboarded user can still reach the onboarding screen class directly -> proceed', () => {
    const claims = authenticatedClaims({ emailVerified: true, onboardingCompleted: true });
    const screenClass = screenClassFor('OnboardingNickname');
    const outcome = evaluateGuard(claims, screenClass, destinationFor(screenClass));
    expect(outcome).toEqual<GuardOutcome>({ type: 'proceed' });
  });
});
