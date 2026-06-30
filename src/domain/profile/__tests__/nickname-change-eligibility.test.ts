import { evaluateNicknameChangeEligibility } from '@/domain/profile/nickname-change-eligibility';

/**
 * ADR-011: the single most important test in this bolt. The original Model
 * stage encoded TWO free post-onboarding nickname changes (wrong); the
 * corrected rule is exactly ONE, confirmed against `betmeet-clone`'s real
 * `setNickname` server action (`nicknameChangeCount >= 2` gate). The
 * `postOnboardingChangeCount: 1` cases below are the exact case the
 * original (wrong) model would have gotten backwards — see ADR-011 for the
 * full evidence trail.
 */
describe('evaluateNicknameChangeEligibility (model.md §2.2, ADR-011)', () => {
  const NOW = '2026-06-30T00:00:00.000Z';

  it('is always allowed while onboarding is incomplete, regardless of change count', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: false,
      postOnboardingChangeCount: 5,
      lastChangeAt: '2026-06-29T00:00:00.000Z',
      now: NOW,
    });
    expect(outcome).toEqual({ allowed: true });
  });

  it('allows the one free post-onboarding grace change (count = 0)', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: true,
      postOnboardingChangeCount: 0,
      lastChangeAt: null,
      now: NOW,
    });
    expect(outcome).toEqual({ allowed: true });
  });

  it('ADR-011 regression: count = 1 (the second post-onboarding change) is COOLDOWN-GATED, not free — this is the corrected behavior, the original Model-stage bug treated this as still-free', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: true,
      postOnboardingChangeCount: 1,
      lastChangeAt: '2026-06-20T00:00:00.000Z', // 10 days ago — within the 30-day window
      now: NOW,
    });
    expect(outcome).toEqual({ allowed: false, cooldownEndsAt: '2026-07-20T00:00:00.000Z' });
  });

  it('count = 1, exactly 30 days since lastChangeAt -> allowed again', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: true,
      postOnboardingChangeCount: 1,
      lastChangeAt: '2026-05-31T00:00:00.000Z', // exactly 30 days before NOW
      now: NOW,
    });
    expect(outcome).toEqual({ allowed: true });
  });

  it('count = 1, 29 days since lastChangeAt -> still gated', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: true,
      postOnboardingChangeCount: 1,
      lastChangeAt: '2026-06-01T00:00:00.000Z', // 29 days before NOW
      now: NOW,
    });
    expect(outcome.allowed).toBe(false);
  });

  it('count >= 2 is cooldown-gated the same way as count = 1 (no further free changes ever)', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: true,
      postOnboardingChangeCount: 4,
      lastChangeAt: '2026-06-25T00:00:00.000Z', // 5 days ago
      now: NOW,
    });
    expect(outcome).toEqual({ allowed: false, cooldownEndsAt: '2026-07-25T00:00:00.000Z' });
  });

  it('fails open (allowed: true) if onboarded with a non-zero count but no lastChangeAt (malformed payload defensive case)', () => {
    const outcome = evaluateNicknameChangeEligibility({
      onboardingCompleted: true,
      postOnboardingChangeCount: 1,
      lastChangeAt: null,
      now: NOW,
    });
    expect(outcome).toEqual({ allowed: true });
  });
});
