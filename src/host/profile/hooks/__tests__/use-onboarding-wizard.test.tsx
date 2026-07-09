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
 * semantics, react-native-testing skill's "always await" rule). `advance(step, status)`
 * itself marks the step and moves `currentStep` in one atomic `setState` —
 * screens no longer need a separate `markDone`/`markSkipped` call before it.
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

  it('advance() is a no-op (returns null) when the required step is marked pending', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    let outcome;
    await act(() => {
      outcome = result.current.advance('nickname', 'pending');
    });
    expect(outcome).toBeNull();
    expect(result.current.currentStep).toBe('nickname');
  });

  it('advance(step, "done") marks the step done and moves to the next step in the same update — no separate markDone/advance render needed', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    let outcome;
    await act(() => {
      outcome = result.current.advance('nickname', 'done');
    });
    expect(outcome).toBe('avatar');
    expect(result.current.currentStep).toBe('avatar');
    expect(result.current.stepStatus.nickname).toBe('done');
  });

  it('a required step cannot be advanced past via "skipped" (nickname/avatar are never skippable)', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    let outcome;
    await act(() => {
      outcome = result.current.advance('nickname', 'skipped');
    });
    expect(outcome).toBeNull();
    expect(result.current.currentStep).toBe('nickname');
  });

  it('a skippable step (rules) can be advanced past via "skipped"', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.advance('nickname', 'done');
    });
    await act(() => {
      result.current.advance('avatar', 'done');
    });
    expect(result.current.currentStep).toBe('rules');

    let outcome;
    await act(() => {
      outcome = result.current.advance('rules', 'skipped');
    });
    expect(outcome).toBe('notifications');
  });

  it('advance() from the final step (second-factor) returns "complete"', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.advance('nickname', 'done');
    });
    await act(() => {
      result.current.advance('avatar', 'done');
    });
    await act(() => {
      result.current.advance('rules', 'skipped');
    });
    await act(() => {
      result.current.advance('notifications', 'skipped');
    });

    let outcome;
    await act(() => {
      outcome = result.current.advance('second-factor', 'skipped');
    });
    expect(outcome).toBe('complete');
    // The wizard's currentStep stays at the last step on "complete" — the
    // screen reacts to the 'complete' signal, this hook never auto-resets.
    expect(result.current.currentStep).toBe('second-factor');
  });

  it('goBack() moves to the previous step and returns it', async () => {
    const { result } = await renderHook(() => useOnboardingWizard());
    await act(() => {
      result.current.advance('nickname', 'done');
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
