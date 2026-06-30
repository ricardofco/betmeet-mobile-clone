import { interpretAvailabilityResponse, validateNicknameBase } from '@/domain/profile/validate-nickname-base';

describe('validateNicknameBase (model.md §2.1, PROFILE-1 AC)', () => {
  it('accepts a valid 3-char base', () => {
    expect(validateNicknameBase('abc')).toEqual({ status: 'available' });
  });

  it('accepts a valid 20-char base', () => {
    expect(validateNicknameBase('a'.repeat(20))).toEqual({ status: 'available' });
  });

  it('accepts letters, numbers, underscores, and hyphens', () => {
    expect(validateNicknameBase('Player_1-99')).toEqual({ status: 'available' });
  });

  it('rejects fewer than 3 characters', () => {
    expect(validateNicknameBase('ab')).toEqual({ status: 'invalid', reason: 'too-short' });
  });

  it('rejects more than 20 characters', () => {
    expect(validateNicknameBase('a'.repeat(21))).toEqual({ status: 'invalid', reason: 'too-long' });
  });

  it('rejects spaces', () => {
    expect(validateNicknameBase('hello world')).toEqual({ status: 'invalid', reason: 'invalid-characters' });
  });

  it('rejects emoji', () => {
    expect(validateNicknameBase('player⚽')).toEqual({ status: 'invalid', reason: 'invalid-characters' });
  });

  it('rejects accented letters', () => {
    expect(validateNicknameBase('jugador')).toEqual({ status: 'available' });
    expect(validateNicknameBase('jugadór')).toEqual({ status: 'invalid', reason: 'invalid-characters' });
  });

  it('never returns "taken" — format validation alone cannot know uniqueness', () => {
    const result = validateNicknameBase('totallyvalidbase');
    expect(result.status).not.toBe('taken');
  });
});

describe('interpretAvailabilityResponse', () => {
  it('maps available: true to status: available', () => {
    expect(interpretAvailabilityResponse({ available: true })).toEqual({ status: 'available' });
  });

  it('maps available: false to status: taken', () => {
    expect(interpretAvailabilityResponse({ available: false })).toEqual({ status: 'taken' });
  });
});
