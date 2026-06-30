import { act, renderHook } from '@testing-library/react-native';
import { useOnboardingWizard } from '@/host/profile/hooks/use-onboarding-wizard';

/**
 * design.md §5.1: this hook owns step/status bookkeeping only and never
 * calls `navigation` itself — directly testable without a navigation
 * container, which this suite exercises.
 *
 * Each state-mutating call is wrapped in its own `await act(...)` so
 * `result.current` reflects the freshly re-rendered hook before the next
 * call reads it — calling multiple mutations inside one `act()` block reads
 * a stale closure for everything after the first (RNTL v14 async-render
 * semantics, react-native-testing skill's "always await" rule).
 */
describe('useOnboardingWizard (design.md §5.1)', () => {
  it('starts at the first step (nickname) with every step pending', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    expect(result.current.currentStep).toBe('nickname');
    expect(result.current.stepStatus).toEqual({
      nickname: 'pending',
      avatar: 'pending',
      rules: 'pending',
      notifications: 'pending',
      'second-factor': 'pending',
    });
  });

  it('advance() is a no-op (returns null) while the required current step is still pending', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    let outcome;
    await act(() => {
      outcome = result.current.advance();
    });
    expect(outcome).toBeNull();
    expect(result.current.currentStep).toBe('nickname');
  });

  it('markDone then advance() moves to the next step in order', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.markDone('nickname');
    });
    let outcome;
    await act(() => {
      outcome = result.current.advance();
    });
    expect(outcome).toBe('avatar');
    expect(result.current.currentStep).toBe('avatar');
  });

  it('a required step cannot be advanced past via markSkipped (nickname/avatar are never skippable)', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.markSkipped('nickname');
    });
    let outcome;
    await act(() => {
      outcome = result.current.advance();
    });
    expect(outcome).toBeNull();
    expect(result.current.currentStep).toBe('nickname');
  });

  it('a skippable step (rules) can be advanced past via markSkipped', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.markDone('nickname');
    });
    await act(() => {
      result.current.advance();
    });
    await act(() => {
      result.current.markDone('avatar');
    });
    await act(() => {
      result.current.advance();
    });
    expect(result.current.currentStep).toBe('rules');

    await act(() => {
      result.current.markSkipped('rules');
    });
    let outcome;
    await act(() => {
      outcome = result.current.advance();
    });
    expect(outcome).toBe('notifications');
  });

  it('advance() from the final step (second-factor) returns "complete"', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.markDone('nickname');
    });
    await act(() => {
      result.current.advance();
    });
    await act(() => {
      result.current.markDone('avatar');
    });
    await act(() => {
      result.current.advance();
    });
    await act(() => {
      result.current.markSkipped('rules');
    });
    await act(() => {
      result.current.advance();
    });
    await act(() => {
      result.current.markSkipped('notifications');
    });
    await act(() => {
      result.current.advance();
    });
    await act(() => {
      result.current.markSkipped('second-factor');
    });

    let outcome;
    await act(() => {
      outcome = result.current.advance();
    });
    expect(outcome).toBe('complete');
    // The wizard's currentStep stays at the last step on "complete" — the
    // screen reacts to the 'complete' signal, this hook never auto-resets.
    expect(result.current.currentStep).toBe('second-factor');
  });

  it('goBack() moves to the previous step and returns it', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.markDone('nickname');
    });
    await act(() => {
      result.current.advance();
    });
    expect(result.current.currentStep).toBe('avatar');

    let outcome;
    await act(() => {
      outcome = result.current.goBack();
    });
    expect(outcome).toBe('nickname');
    expect(result.current.currentStep).toBe('nickname');
  });

  it('goBack() from the first step returns null and does not change currentStep', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    let outcome;
    await act(() => {
      outcome = result.current.goBack();
    });
    expect(outcome).toBeNull();
    expect(result.current.currentStep).toBe('nickname');
  });
});
