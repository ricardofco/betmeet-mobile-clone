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
 *
 * Bolt 9 (ADR-042): the old flat `AppStackParamList` is replaced by a nested
 * Drawer → Tabs → per-tab-stack shape. Route names (`Home`/`Predictions`/
 * `Pools`/`Settings`) are unchanged — only their container nesting is new —
 * so `screen-registry.ts`'s `SCREEN_REGISTRY` keys need zero edits.
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

/** Bolt 9 (ADR-042) — the outermost tree `AuthGatedNavigator.renderAppTree` mounts. */
export type RootDrawerParamList = {
  MainTabs: undefined;
  Settings: undefined;
};

/**
 * Bolt 9 (ADR-042) — one tab per primary module; each owns its own
 * native-stack. Bolt 10 (ADR-048) adds the 4th tab, `RankingsTab` —
 * confirms Bolt 9's own forward-compatibility check that `MainTabNavigator`
 * accepts additional `Tab.Screen`s without a reshape.
 */
export type MainTabParamList = {
  HomeTab: undefined;
  PredictionsTab: undefined;
  PoolsTab: undefined;
  RankingsTab: undefined;
};

/** Bolt 12 (ADR-053) — `Education` is a real push, not a tab-root sibling. */
export type HomeStackParamList = {
  Home: undefined;
  Education: undefined;
};

export type PredictionsStackParamList = {
  Predictions: undefined;
};

export type PoolsStackParamList = {
  Pools: undefined;
};

/** Bolt 10 (ADR-048) — RANKINGS-1's own top-level stack. */
export type RankingsStackParamList = {
  Rankings: undefined;
};

export type SettingsStackParamList = {
  AccountSettings: undefined;
  ChangeNickname: undefined;
  ChangeAvatar: undefined;
  ChangeLocale: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
  TotpEnrollment: undefined;
  /** Bolt 8 (AUTH-6). */
  DeleteAccount: undefined;
  /** Bolt 13 (ADMIN-1..5, ADR-057/059) — mounts the entire `admin` remote,
   * same shape as `Pools`/`Education` mounting their own remotes. */
  Admin: undefined;
};

export type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';
