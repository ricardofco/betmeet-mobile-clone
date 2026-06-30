/**
 * PROFILE-4's onboarding wizard step aggregate (model.md §2.7). Fixed linear
 * order; `nickname`/`avatar` are required (can never be `'skipped'`);
 * `rules`/`notifications`/`second-factor` are skippable (ADR-010: the
 * TOTP-nudge final step is modeled identically to the other two optional
 * steps, no special-cased "last step" branch).
 *
 * No step status is ever persisted beyond the wizard's in-memory session —
 * closing/backgrounding the app mid-wizard re-enters at `nickname`
 * (domain-overview.md §4.4: "no seen-rules state is persisted", generalized
 * to the whole wizard).
 */
export type OnboardingStepId = 'nickname' | 'avatar' | 'rules' | 'notifications' | 'second-factor';

export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  'nickname',
  'avatar',
  'rules',
  'notifications',
  'second-factor',
];

export type OnboardingStepStatus = 'pending' | 'done' | 'skipped';

export type OnboardingWizardState = {
  currentStep: OnboardingStepId;
  stepStatus: Record<OnboardingStepId, OnboardingStepStatus>;
};

const REQUIRED_STEPS: ReadonlySet<OnboardingStepId> = new Set(['nickname', 'avatar']);

export function isStepRequired(step: OnboardingStepId): boolean {
  return REQUIRED_STEPS.has(step);
}

export function isStepSkippable(step: OnboardingStepId): boolean {
  return !REQUIRED_STEPS.has(step);
}

/**
 * Whether the wizard may move forward past `step`, given its current status.
 * Required steps must be `'done'`; skippable steps may be `'done'` or
 * `'skipped'`.
 */
export function canAdvanceFrom(step: OnboardingStepId, status: OnboardingStepStatus): boolean {
  if (isStepRequired(step)) {
    return status === 'done';
  }
  return status === 'done' || status === 'skipped';
}

/** Returns the step after `current`, or `null` if `current` is the last step (wizard complete). */
export function nextStep(current: OnboardingStepId): OnboardingStepId | null {
  const index = ONBOARDING_STEP_ORDER.indexOf(current);
  const next = ONBOARDING_STEP_ORDER[index + 1];
  return next ?? null;
}

/** Returns the step before `current`, or `null` if `current` is already the first step. */
export function previousStep(current: OnboardingStepId): OnboardingStepId | null {
  const index = ONBOARDING_STEP_ORDER.indexOf(current);
  if (index <= 0) return null;
  return ONBOARDING_STEP_ORDER[index - 1];
}
