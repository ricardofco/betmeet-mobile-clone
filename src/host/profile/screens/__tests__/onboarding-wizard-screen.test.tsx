import { act, renderHook } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import {
  OnboardingWizardProvider,
  useOnboardingWizardContext,
} from '@/host/profile/screens/onboarding-wizard-screen';
import { profileApi } from '@/platform/backend-api/profile-api';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { i18n } from '@/platform/i18n/i18n';
import { en } from '@/platform/i18n/locales/en';

jest.mock('@/platform/backend-api/profile-api');
jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockedProfileApi = profileApi as jest.Mocked<typeof profileApi>;
const mockAdapter = { refreshSession: jest.fn() };

/**
 * model.md §2.8, design.md §5.1: `completeWizard()` is the wizard's sole
 * completion trigger — a single `profile.completeOnboarding` backend call
 * that never writes to the Zustand auth-session store directly. Claim
 * propagation happens through the existing `onSessionChange` pipeline
 * (ADR-002, Bolt 1) — this test asserts the call shape, not the navigator
 * re-render (covered by the existing `AuthGatedNavigator`/guard tests).
 */
describe('OnboardingWizardProvider (model.md §2.8)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
    await i18n.changeLanguage('en');
  });

  function renderWizard(notificationsOptIn?: boolean) {
    // Change-2026-07-08 (i18n completion): `completeWizard()`'s failure copy
    // now routes through `t()` — wraps with the real `i18n` instance
    // (English, so assertions below can compare against `en.ts`'s literal
    // catalog value directly) instead of a hardcoded string, same pattern
    // every other i18n-aware component test in this repo already uses.
    return renderHook(() => useOnboardingWizardContext(), {
      wrapper: ({ children }) => (
        <I18nextProvider i18n={i18n}>
          <OnboardingWizardProvider notificationsOptIn={notificationsOptIn}>{children}</OnboardingWizardProvider>
        </I18nextProvider>
      ),
    });
  }

  it('throws if used outside the provider (fail loud, not silent undefined)', async () => {
    const { result } = await renderHook(() => {
      try {
        return useOnboardingWizardContext();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it('completeWizard() calls profile.completeOnboarding and then re-fetches the session on success', async () => {
    mockedProfileApi.completeOnboarding.mockResolvedValue({ ok: true });
    mockAdapter.refreshSession.mockResolvedValue(null);
    const { result } = await renderWizard();

    await act(async () => {
      await result.current.completeWizard();
    });

    expect(mockedProfileApi.completeOnboarding).toHaveBeenCalledWith(false);
    expect(mockAdapter.refreshSession).toHaveBeenCalled();
    expect(result.current.completionError).toBeNull();
  });

  it('passes notificationsOptIn explicitly when provided, overriding the notifications step status', async () => {
    mockedProfileApi.completeOnboarding.mockResolvedValue({ ok: true });
    mockAdapter.refreshSession.mockResolvedValue(null);
    const { result } = await renderWizard(true);

    await act(async () => {
      await result.current.completeWizard();
    });

    expect(mockedProfileApi.completeOnboarding).toHaveBeenCalledWith(true);
  });

  it('defaults notificationsOptIn to whether the notifications step resolved to "done"', async () => {
    mockedProfileApi.completeOnboarding.mockResolvedValue({ ok: true });
    mockAdapter.refreshSession.mockResolvedValue(null);
    const { result } = await renderWizard();

    await act(() => {
      result.current.markDone('notifications');
    });
    await act(async () => {
      await result.current.completeWizard();
    });

    expect(mockedProfileApi.completeOnboarding).toHaveBeenCalledWith(true);
  });

  it('sets completionError and does not call getSession when the backend reports failure', async () => {
    mockedProfileApi.completeOnboarding.mockResolvedValue({ ok: false, error: 'unknown' });
    const { result } = await renderWizard();

    await act(async () => {
      await result.current.completeWizard();
    });

    expect(result.current.completionError).toBe(en.profile.onboarding.completionError);
    expect(mockAdapter.refreshSession).not.toHaveBeenCalled();
  });
});
