import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useOnboardingWizard } from '@/host/profile/hooks/use-onboarding-wizard';
import { profileApi } from '@/platform/backend-api/profile-api';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import type { OnboardingStepId } from '@/domain/profile/onboarding-wizard-state';

/**
 * The wizard's completion trigger (model.md §2.8, design.md §5.1):
 * `profile.completeOnboarding` is the single backend call. Its success does
 * **not** write to the Zustand auth-session store directly — claim
 * propagation happens through the existing `onSessionChange` pipeline
 * (ADR-002, Bolt 1), exactly like every other claim-affecting mutation in
 * this app. This bolt only triggers a session re-fetch so `onSessionChange`
 * fires promptly with the updated `onboarding_completed` claim, rather than
 * waiting for the SDK's own refresh cadence.
 */
type OnboardingWizardContextValue = ReturnType<typeof useOnboardingWizard> & {
  completeWizard: () => Promise<void>;
  completionError: string | null;
};

const OnboardingWizardContext = createContext<OnboardingWizardContextValue | null>(null);

export function useOnboardingWizardContext(): OnboardingWizardContextValue {
  const value = useContext(OnboardingWizardContext);
  if (!value) {
    throw new Error('useOnboardingWizardContext must be used within OnboardingWizardProvider');
  }
  return value;
}

type OnboardingWizardProviderProps = {
  children: ReactNode;
  /** Whether the (skippable) `notifications` step resolved to `'done'` rather than `'skipped'` — passed through to `profile.completeOnboarding` per model.md §5's "opts into all 5 notification types if completed" fact. */
  notificationsOptIn?: boolean;
};

export function OnboardingWizardProvider({ children, notificationsOptIn }: OnboardingWizardProviderProps) {
  const wizard = useOnboardingWizard();
  const [completionError, setCompletionError] = useState<string | null>(null);

  const completeWizard = useCallback(async () => {
    setCompletionError(null);
    const optIn = notificationsOptIn ?? wizard.stepStatus.notifications === 'done';
    const response = await profileApi.completeOnboarding(optIn);
    if (!response.ok) {
      setCompletionError('Something went wrong finishing setup. Please try again.');
      return;
    }
    // Forces a fresh `getSession()` read so `onSessionChange` fires with the
    // now-updated `onboarding_completed` claim promptly (Bolt 1's existing
    // pipeline, ADR-002) — `AuthGatedNavigator` re-evaluates the guard from
    // there; this provider does not touch the Zustand store directly.
    await getSupabaseAdapter().getSession();
  }, [notificationsOptIn, wizard.stepStatus]);

  const value = useMemo<OnboardingWizardContextValue>(
    () => ({ ...wizard, completeWizard, completionError }),
    [wizard, completeWizard, completionError],
  );

  return <OnboardingWizardContext.Provider value={value}>{children}</OnboardingWizardContext.Provider>;
}

/** Exported for tests that need to assert on a specific step without mounting the full provider tree. */
export type { OnboardingStepId };
