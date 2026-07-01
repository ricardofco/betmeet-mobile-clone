import {
  validatePredictionEntry,
  shouldShowPenaltyWinnerSelector,
} from '@/domain/predictions/prediction-entry-validation';

describe('validatePredictionEntry (model.md §3, domain-overview.md §5.4)', () => {
  it('is valid for an in-range, non-knockout, non-tied prediction with no penalty winner', () => {
    const result = validatePredictionEntry({ homeScore: 2, awayScore: 1, penaltyWinner: null }, false);
    expect(result).toEqual({ valid: true });
  });

  it.each([
    [-1, 'HOME_SCORE_OUT_OF_RANGE'],
    [21, 'HOME_SCORE_OUT_OF_RANGE'],
  ])('rejects an out-of-range home score (%i)', (homeScore, expectedError) => {
    const result = validatePredictionEntry({ homeScore: homeScore as number, awayScore: 1, penaltyWinner: null }, false);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain(expectedError);
  });

  it.each([
    [-1, 'AWAY_SCORE_OUT_OF_RANGE'],
    [21, 'AWAY_SCORE_OUT_OF_RANGE'],
  ])('rejects an out-of-range away score (%i)', (awayScore, expectedError) => {
    const result = validatePredictionEntry({ homeScore: 1, awayScore: awayScore as number, penaltyWinner: null }, false);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain(expectedError);
  });

  it('accepts boundary scores 0 and 20', () => {
    expect(validatePredictionEntry({ homeScore: 0, awayScore: 20, penaltyWinner: null }, false)).toEqual({
      valid: true,
    });
  });

  it('rejects a non-integer home score', () => {
    const result = validatePredictionEntry({ homeScore: 1.5, awayScore: 1, penaltyWinner: null }, false);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('HOME_SCORE_NOT_INTEGER');
  });

  it('rejects a non-integer away score', () => {
    const result = validatePredictionEntry({ homeScore: 1, awayScore: 2.2, penaltyWinner: null }, false);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('AWAY_SCORE_NOT_INTEGER');
  });

  it('requires a penalty winner for a tied knockout match', () => {
    const result = validatePredictionEntry({ homeScore: 2, awayScore: 2, penaltyWinner: null }, true);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('PENALTY_WINNER_REQUIRED');
  });

  it('is valid for a tied knockout match with a penalty winner supplied', () => {
    const result = validatePredictionEntry({ homeScore: 2, awayScore: 2, penaltyWinner: 'home' }, true);
    expect(result).toEqual({ valid: true });
  });

  it('rejects a penalty winner supplied for a non-tied knockout match', () => {
    const result = validatePredictionEntry({ homeScore: 2, awayScore: 1, penaltyWinner: 'home' }, true);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('PENALTY_WINNER_NOT_APPLICABLE');
  });

  it('rejects a penalty winner supplied for a tied NON-knockout match (server strips/rejects it)', () => {
    const result = validatePredictionEntry({ homeScore: 1, awayScore: 1, penaltyWinner: 'away' }, false);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('PENALTY_WINNER_NOT_APPLICABLE');
  });

  it('is valid for a tied non-knockout match with no penalty winner', () => {
    const result = validatePredictionEntry({ homeScore: 1, awayScore: 1, penaltyWinner: null }, false);
    expect(result).toEqual({ valid: true });
  });

  it('accumulates multiple errors at once', () => {
    const result = validatePredictionEntry({ homeScore: -1, awayScore: 21, penaltyWinner: null }, false);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors).toEqual(
      expect.arrayContaining(['HOME_SCORE_OUT_OF_RANGE', 'AWAY_SCORE_OUT_OF_RANGE']),
    );
  });
});

describe('shouldShowPenaltyWinnerSelector', () => {
  it('is true only when knockout and scores are equal integers', () => {
    expect(shouldShowPenaltyWinnerSelector(1, 1, true)).toBe(true);
  });

  it('is false when not knockout, even if tied', () => {
    expect(shouldShowPenaltyWinnerSelector(1, 1, false)).toBe(false);
  });

  it('is false when knockout but not tied', () => {
    expect(shouldShowPenaltyWinnerSelector(2, 1, true)).toBe(false);
  });

  it('is false when either score is not yet a valid integer (mid-entry)', () => {
    expect(shouldShowPenaltyWinnerSelector(NaN, 1, true)).toBe(false);
  });
});
