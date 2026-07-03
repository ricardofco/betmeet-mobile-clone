import type { ScreenClass } from '@/domain/auth/screen-class';

/**
 * The `routeName -> ScreenClass` table every screen in the app registers
 * into to be reachable at all (ADR-001) — `AuthGatedNavigator` only ever
 * mounts screens whose declared class is allowed by the current guard
 * outcome. `ScreenClass` is a tag array (ADR-004): a screen can satisfy more
 * than one rule's "is this reachable" check simultaneously.
 *
 * Bolt 2 additions (ADR-008):
 *   - `SetNewPassword` replaces `ResetPassword` (model terminology alignment).
 *   - `MfaChallenge` gets the new `mfa-challenge` tag.
 *   - Settings-area screens get `protected` tag.
 *
 * Bolt 3 additions (design.md §5):
 *   - `Onboarding` (single placeholder route) is replaced by the 5 real
 *     wizard screens, all sharing the same `['onboarding']` tag — the guard
 *     only ever checks "is *some* onboarding screen showing," never which
 *     step, so no new tag is needed (design.md §5.1).
 *   - `ChangeNickname`/`ChangeAvatar`/`ChangeLocale` (PROFILE-5, Settings)
 *     get the `protected` tag, same as the existing Settings rows.
 *
 * Bolt 6 addition (design.md §4): `Predictions` gets the `protected` tag —
 * same as `Home` — reachable only past the onboarding gate (Bolt 3's
 * dependency, not re-implemented here).
 *
 * Bolt 7 addition (design.md §5): `Pools` gets the `protected` tag — same
 * as `Home`/`Predictions`. This single route mounts the entire `pools`
 * remote (ADR-032/ADR-034); the remote's own internal screens are invisible
 * to this registry.
 */
export const SCREEN_REGISTRY = {
  // ── Unauthenticated / auth-only ──
  SignIn: ['public', 'auth-only'] as ScreenClass,
  SignUp: ['public', 'auth-only'] as ScreenClass,
  ForgotPassword: ['public', 'auth-only'] as ScreenClass,
  SetNewPassword: ['public', 'auth-only'] as ScreenClass,
  VerifyEmail: ['public', 'verify-email', 'auth-only'] as ScreenClass,

  // ── MFA challenge (Bolt 2) ──
  MfaChallenge: ['mfa-challenge'] as ScreenClass,

  // ── Onboarding wizard (Bolt 3) ──
  OnboardingNickname: ['onboarding'] as ScreenClass,
  OnboardingAvatar: ['onboarding'] as ScreenClass,
  OnboardingRules: ['onboarding'] as ScreenClass,
  OnboardingNotifications: ['onboarding'] as ScreenClass,
  OnboardingSecondFactor: ['onboarding'] as ScreenClass,

  // ── Protected app screens ──
  Home: ['protected'] as ScreenClass,
  Predictions: ['protected'] as ScreenClass,
  Pools: ['protected'] as ScreenClass,

  // ── Settings area (Bolt 2 + Bolt 3) ──
  AccountSettings: ['protected'] as ScreenClass,
  ChangeNickname: ['protected'] as ScreenClass,
  ChangeAvatar: ['protected'] as ScreenClass,
  ChangeLocale: ['protected'] as ScreenClass,
  ChangePassword: ['protected'] as ScreenClass,
  ChangeEmail: ['protected'] as ScreenClass,
  TotpEnrollment: ['protected'] as ScreenClass,
  /** Bolt 8 (AUTH-6) — same `protected` tag as every other Settings row. */
  DeleteAccount: ['protected'] as ScreenClass,
} as const;

export type RegisteredRouteName = keyof typeof SCREEN_REGISTRY;

export function screenClassFor(routeName: RegisteredRouteName): ScreenClass {
  return SCREEN_REGISTRY[routeName];
}
