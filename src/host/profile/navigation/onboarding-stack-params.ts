/**
 * Param list for the real onboarding wizard stack (design.md §5.1),
 * replacing the Bolt-1 placeholder `OnboardingStackParamList` in
 * `auth-stack-params.ts` (the single source of truth — this file exists so
 * the wizard's own screens import a narrowly-scoped type rather than the
 * full auth-stack-params union, mirroring `auth-stack-params.ts`'s own
 * per-tree grouping).
 */
export type OnboardingStackParamList = {
  OnboardingNickname: undefined;
  OnboardingAvatar: undefined;
  OnboardingRules: undefined;
  OnboardingNotifications: undefined;
  OnboardingSecondFactor: undefined;
};
