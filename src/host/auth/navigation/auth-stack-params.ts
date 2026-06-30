import type { VerifyEmailScreenParams } from '@/host/auth/screens/verify-email-screen';

/**
 * Param lists for the screen trees `AuthGatedNavigator` mounts. Kept as one
 * shared type so screens and the navigator agree on shape; not every screen
 * here is registered in every tree (e.g. `VerifyEmail` is only mounted in
 * `UnauthenticatedTree`/`VerifyEmailTree`, see auth-gated-navigator.tsx).
 *
 * Bolt 2: `SetNewPassword` replaces `ResetPassword` (model terminology);
 * `MfaStackParamList` and `SettingsStackParamList` are new.
 *
 * Bolt 3 (design.md §5): `OnboardingStackParamList` is re-exported from
 * `@/host/profile/navigation/onboarding-stack-params` (the real 5-screen
 * wizard, replacing the single-screen placeholder) — kept as a re-export
 * here so `auth-gated-navigator.tsx` doesn't need to import from two
 * different param-list modules. `SettingsStackParamList` gains the three new
 * Profile rows (`ChangeNickname`/`ChangeAvatar`/`ChangeLocale`, PROFILE-5).
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
  ChangeNickname: undefined;
  ChangeAvatar: undefined;
  ChangeLocale: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
  TotpEnrollment: undefined;
};

export type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';
