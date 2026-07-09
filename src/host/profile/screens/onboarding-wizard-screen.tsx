import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const wizard = useOnboardingWizard();
  const [completionError, setCompletionError] = useState<string | null>(null);

  const completeWizard = useCallback(async () => {
    setCompletionError(null);
    const optIn = notificationsOptIn ?? wizard.stepStatus.notifications === 'done';
    const response = await profileApi.completeOnboarding(optIn);
    if (!response.ok) {
      setCompletionError(t('profile.onboarding.completionError'));
      return;
    }
    // Forces a real token refresh (not just a cached-token `getSession()`
    // read) so the Custom Access Token Hook re-stamps the now-updated
    // `onboarding_completed` claim and `onAuthStateChange` fires with it
    // (Bolt 1's existing pipeline, ADR-002) — `onSessionChange` picks that
    // event up and calls `setSession` itself; `AuthGatedNavigator` then
    // re-evaluates the guard from there. This provider never touches the
    // Zustand store directly. A plain `getSession()` does NOT work here:
    // it only decodes whatever token is already cached and never emits an
    // auth-state event, so the guard would keep reading the stale claim
    // forever (confirmed by inspecting the cached JWT directly — it still
    // carried `onboarding_completed: false` after completion).
    await getSupabaseAdapter().refreshSession();
  }, [notificationsOptIn, wizard.stepStatus, t]);

  const value = useMemo<OnboardingWizardContextValue>(
    () => ({ ...wizard, completeWizard, completionError }),
    [wizard, completeWizard, completionError],
  );

  return <OnboardingWizardContext.Provider value={value}>{children}</OnboardingWizardContext.Provider>;
}

/** Exported for tests that need to assert on a specific step without mounting the full provider tree. */
export type { OnboardingStepId };
