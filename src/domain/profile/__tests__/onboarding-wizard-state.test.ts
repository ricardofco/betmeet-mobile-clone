import {
  ONBOARDING_STEP_ORDER,
  canAdvanceFrom,
  isStepRequired,
  isStepSkippable,
  nextStep,
  previousStep,
} from '@/domain/profile/onboarding-wizard-state';

describe('onboarding-wizard-state (model.md §2.7, PROFILE-4 AC)', () => {
  it('the fixed step order is exactly nickname -> avatar -> rules -> notifications -> second-factor', () => {
    expect(ONBOARDING_STEP_ORDER).toEqual(['nickname', 'avatar', 'rules', 'notifications', 'second-factor']);
  });

  describe('isStepRequired / isStepSkippable', () => {
    it('nickname and avatar are required, never skippable', () => {
      expect(isStepRequired('nickname')).toBe(true);
      expect(isStepRequired('avatar')).toBe(true);
      expect(isStepSkippable('nickname')).toBe(false);
      expect(isStepSkippable('avatar')).toBe(false);
    });

    it('rules and notifications are skippable, not required', () => {
      expect(isStepRequired('rules')).toBe(false);
      expect(isStepRequired('notifications')).toBe(false);
      expect(isStepSkippable('rules')).toBe(true);
      expect(isStepSkippable('notifications')).toBe(true);
    });

    it('ADR-010: second-factor (the TOTP nudge, replacing the web app\'s passkey step) is skippable like rules/notifications — no special-cased "last step" exception', () => {
      expect(isStepRequired('second-factor')).toBe(false);
      expect(isStepSkippable('second-factor')).toBe(true);
    });
  });

  describe('canAdvanceFrom', () => {
    it('a required step (nickname) only allows advancing when done, never when skipped', () => {
      expect(canAdvanceFrom('nickname', 'done')).toBe(true);
      expect(canAdvanceFrom('nickname', 'skipped')).toBe(false);
      expect(canAdvanceFrom('nickname', 'pending')).toBe(false);
    });

    it('a skippable step (rules) allows advancing when done OR skipped', () => {
      expect(canAdvanceFrom('rules', 'done')).toBe(true);
      expect(canAdvanceFrom('rules', 'skipped')).toBe(true);
      expect(canAdvanceFrom('rules', 'pending')).toBe(false);
    });

    it('the final step (second-factor) allows advancing (i.e. completing) when done OR skipped, same as any other skippable step', () => {
      expect(canAdvanceFrom('second-factor', 'done')).toBe(true);
      expect(canAdvanceFrom('second-factor', 'skipped')).toBe(true);
    });
  });

  describe('nextStep / previousStep', () => {
    it('walks forward through the full fixed order', () => {
      expect(nextStep('nickname')).toBe('avatar');
      expect(nextStep('avatar')).toBe('rules');
      expect(nextStep('rules')).toBe('notifications');
      expect(nextStep('notifications')).toBe('second-factor');
    });

    it('returns null past the last step (wizard complete signal)', () => {
      expect(nextStep('second-factor')).toBeNull();
    });

    it('walks backward through the full fixed order', () => {
      expect(previousStep('second-factor')).toBe('notifications');
      expect(previousStep('notifications')).toBe('rules');
      expect(previousStep('rules')).toBe('avatar');
      expect(previousStep('avatar')).toBe('nickname');
    });

    it('returns null before the first step', () => {
      expect(previousStep('nickname')).toBeNull();
    });
  });
});
