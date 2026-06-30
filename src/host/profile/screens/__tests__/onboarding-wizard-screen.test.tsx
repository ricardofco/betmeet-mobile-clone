import { act, renderHook } from '@testing-library/react-native';
import {
  OnboardingWizardProvider,
  useOnboardingWizardContext,
} from '@/host/profile/screens/onboarding-wizard-screen';
import { profileApi } from '@/platform/backend-api/profile-api';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

jest.mock('@/platform/backend-api/profile-api');
jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockedProfileApi = profileApi as jest.Mocked<typeof profileApi>;
const mockAdapter = { getSession: jest.fn() };

/**
 * model.md §2.8, design.md §5.1: `completeWizard()` is the wizard's sole
 * completion trigger — a single `profile.completeOnboarding` backend call
 * that never writes to the Zustand auth-session store directly. Claim
 * propagation happens through the existing `onSessionChange` pipeline
 * (ADR-002, Bolt 1) — this test asserts the call shape, not the navigator
 * re-render (covered by the existing `AuthGatedNavigator`/guard tests).
 */
describe('OnboardingWizardProvider (model.md §2.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
  });

  function renderWizard(notificationsOptIn?: boolean) {
    return renderHook(() => useOnboardingWizardContext(), {
      wrapper: ({ children }) => (
        <OnboardingWizardProvider notificationsOptIn={notificationsOptIn}>{children}</OnboardingWizardProvider>
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
    mockAdapter.getSession.mockResolvedValue(null);
    const { result } = await renderWizard();

    await act(async () => {
      await result.current.completeWizard();
    });

    expect(mockedProfileApi.completeOnboarding).toHaveBeenCalledWith(false);
    expect(mockAdapter.getSession).toHaveBeenCalled();
    expect(result.current.completionError).toBeNull();
  });

  it('passes notificationsOptIn explicitly when provided, overriding the notifications step status', async () => {
    mockedProfileApi.completeOnboarding.mockResolvedValue({ ok: true });
    mockAdapter.getSession.mockResolvedValue(null);
    const { result } = await renderWizard(true);

    await act(async () => {
      await result.current.completeWizard();
    });

    expect(mockedProfileApi.completeOnboarding).toHaveBeenCalledWith(true);
  });

  it('defaults notificationsOptIn to whether the notifications step resolved to "done"', async () => {
    mockedProfileApi.completeOnboarding.mockResolvedValue({ ok: true });
    mockAdapter.getSession.mockResolvedValue(null);
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

    expect(result.current.completionError).toBe('Something went wrong finishing setup. Please try again.');
    expect(mockAdapter.getSession).not.toHaveBeenCalled();
  });
});
