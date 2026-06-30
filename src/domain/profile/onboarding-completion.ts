/**
 * PROFILE-4's onboarding-completion outcome (model.md §2.8). Marking
 * onboarding complete is a single backend call
 * (`profile.completeOnboarding`, design.md §3.1) that returns success/
 * failure only — claim propagation back into `AuthClaims.onboardingCompleted`
 * happens through the existing `onSessionChange` -> Zustand store pipeline
 * (ADR-002, Bolt 1), exactly like every other claim-affecting mutation in
 * this app. This bolt never writes to the Zustand auth-session store
 * directly for this claim.
 */
export type OnboardingCompletionResult = { type: 'completed' } | { type: 'error' };
