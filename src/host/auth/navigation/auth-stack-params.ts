import type { VerifyEmailScreenParams } from '@/host/auth/screens/verify-email-screen';

/**
 * Param lists for the screen trees `AuthGatedNavigator` mounts. Kept as one
 * shared type so screens and the navigator agree on shape; not every screen
 * here is registered in every tree (e.g. `VerifyEmail` is only mounted in
 * `UnauthenticatedTree`/`VerifyEmailTree`, see auth-gated-navigator.tsx).
 */
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  VerifyEmail: VerifyEmailScreenParams;
};

export type AppStackParamList = {
  Home: undefined;
};

export type OnboardingStackParamList = {
  Onboarding: undefined;
};
