import { useCallback, useState } from 'react';
import {
  ONBOARDING_STEP_ORDER,
  canAdvanceFrom,
  nextStep,
  previousStep,
  type OnboardingStepId,
  type OnboardingStepStatus,
  type OnboardingWizardState,
} from '@/domain/profile/onboarding-wizard-state';

/**
 * Wraps `OnboardingWizardState` (model.md §2.7) as local component state
 * (design.md §5.1) — never Zustand, never persisted. This hook owns the
 * step/status bookkeeping only; it never calls `navigation` itself, keeping
 * it directly unit-testable without a navigation container (design.md §5.1).
 * Screens read `currentStep`/`canGoNext`/`canGoBack` and drive their own
 * `navigation.navigate(...)` calls from the pure step transitions this hook
 * exposes.
 */
function initialState(): OnboardingWizardState {
  const stepStatus = Object.fromEntries(
    ONBOARDING_STEP_ORDER.map(step => [step, 'pending' as OnboardingStepStatus]),
  ) as Record<OnboardingStepId, OnboardingStepStatus>;
  return { currentStep: ONBOARDING_STEP_ORDER[0], stepStatus };
}

export function useOnboardingWizard() {
  const [state, setState] = useState<OnboardingWizardState>(initialState);

  const markDone = useCallback((step: OnboardingStepId) => {
    setState(prev => ({ ...prev, stepStatus: { ...prev.stepStatus, [step]: 'done' } }));
  }, []);

  const markSkipped = useCallback((step: OnboardingStepId) => {
    setState(prev => ({ ...prev, stepStatus: { ...prev.stepStatus, [step]: 'skipped' } }));
  }, []);

  /** Returns the step to navigate to, or `null` if advancing isn't allowed yet, or `'complete'` if the wizard is finished. */
  const advance = useCallback((): OnboardingStepId | 'complete' | null => {
    const status = state.stepStatus[state.currentStep];
    if (!canAdvanceFrom(state.currentStep, status)) {
      return null;
    }
    const next = nextStep(state.currentStep);
    if (next === null) {
      return 'complete';
    }
    setState(prev => ({ ...prev, currentStep: next }));
    return next;
  }, [state.currentStep, state.stepStatus]);

  const goBack = useCallback((): OnboardingStepId | null => {
    const prev = previousStep(state.currentStep);
    if (prev === null) return null;
    setState(s => ({ ...s, currentStep: prev }));
    return prev;
  }, [state.currentStep]);

  return {
    currentStep: state.currentStep,
    stepStatus: state.stepStatus,
    markDone,
    markSkipped,
    advance,
    goBack,
  };
}
