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

  // ── Onboarding ──
  Onboarding: ['onboarding'] as ScreenClass,

  // ── Protected app screens ──
  Home: ['protected'] as ScreenClass,

  // ── Settings area (Bolt 2) ──
  AccountSettings: ['protected'] as ScreenClass,
  ChangePassword: ['protected'] as ScreenClass,
  ChangeEmail: ['protected'] as ScreenClass,
  TotpEnrollment: ['protected'] as ScreenClass,
} as const;

export type RegisteredRouteName = keyof typeof SCREEN_REGISTRY;

export function screenClassFor(routeName: RegisteredRouteName): ScreenClass {
  return SCREEN_REGISTRY[routeName];
}
