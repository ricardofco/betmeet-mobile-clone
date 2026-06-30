import type { VerifyEmailScreenParams } from '@/host/auth/screens/verify-email-screen';

/**
 * Param lists for the screen trees `AuthGatedNavigator` mounts. Kept as one
 * shared type so screens and the navigator agree on shape; not every screen
 * here is registered in every tree (e.g. `VerifyEmail` is only mounted in
 * `UnauthenticatedTree`/`VerifyEmailTree`, see auth-gated-navigator.tsx).
 *
 * Bolt 2: `SetNewPassword` replaces `ResetPassword` (model terminology);
 * `MfaStackParamList` and `SettingsStackParamList` are new.
 */
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  SetNewPassword: undefined;
  VerifyEmail: VerifyEmailScreenParams;
};

export type MfaStackParamList = {
  MfaChallenge: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Settings: undefined;
};

export type SettingsStackParamList = {
  AccountSettings: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
  TotpEnrollment: undefined;
};

export type OnboardingStackParamList = {
  Onboarding: undefined;
};
