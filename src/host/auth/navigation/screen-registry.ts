import type { ScreenClass } from '@/domain/auth/screen-class';

/**
 * The `routeName -> ScreenClass` table every screen in the app registers
 * into to be reachable at all (ADR-001) — `AuthGatedNavigator` only ever
 * mounts screens whose declared class is allowed by the current guard
 * outcome. `ScreenClass` is a tag array (ADR-004): a screen can satisfy more
 * than one rule's "is this reachable" check simultaneously.
 *
 * `forgot-password`/`reset-password` are reserved here (route name + class)
 * per AUTH-7's rule 2 even though their UI is AUTH-4 (Bolt 2, out of scope)
 * — this keeps the guard's rule table complete without building screens
 * this bolt doesn't own (model.md's extension-seam instruction).
 */
export const SCREEN_REGISTRY = {
  SignIn: ['public', 'auth-only'] as ScreenClass,
  SignUp: ['public', 'auth-only'] as ScreenClass,
  ForgotPassword: ['public', 'auth-only'] as ScreenClass,
  ResetPassword: ['public', 'auth-only'] as ScreenClass,
  VerifyEmail: ['public', 'verify-email', 'auth-only'] as ScreenClass,
  Onboarding: ['onboarding'] as ScreenClass,
  Home: ['protected'] as ScreenClass,
} as const;

export type RegisteredRouteName = keyof typeof SCREEN_REGISTRY;

export function screenClassFor(routeName: RegisteredRouteName): ScreenClass {
  return SCREEN_REGISTRY[routeName];
}
