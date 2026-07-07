import { validateForceResultScoreBounds, validatePenaltyScoreShape } from '../force-result-validation';
import { validateScoreBounds } from '../../prediction-eligibility';

describe('validateForceResultScoreBounds (backend twin of src/domain/admin, design.md §6.2)', () => {
  it('accepts an in-range score', () => {
    expect(validateForceResultScoreBounds(2, 1)).toBe(true);
  });

  it('accepts the boundary values 0 and 50', () => {
    expect(validateForceResultScoreBounds(0, 50)).toBe(true);
    expect(validateForceResultScoreBounds(50, 0)).toBe(true);
  });

  it('rejects a negative score', () => {
    expect(validateForceResultScoreBounds(-1, 0)).toBe(false);
  });

  it('rejects a score above 50', () => {
    expect(validateForceResultScoreBounds(51, 0)).toBe(false);
  });

  it('rejects a non-integer score', () => {
    expect(validateForceResultScoreBounds(1.5, 1)).toBe(false);
  });

  // Same independence regression as the mobile domain twin: a score in
  // 21-50 must pass here and fail predictions' own 0-20 bound.
  it('REGRESSION: a score >20 but <=50 passes here but fails validateScoreBounds (predictions 0-20)', () => {
    expect(validateForceResultScoreBounds(25, 0)).toBe(true);
    expect(validateScoreBounds(25, 0)).toBe(false);
  });
});

describe('validatePenaltyScoreShape', () => {
  it('accepts an in-range non-negative integer', () => {
    expect(validatePenaltyScoreShape(4)).toBe(true);
    expect(validatePenaltyScoreShape(0)).toBe(true);
    expect(validatePenaltyScoreShape(50)).toBe(true);
  });

  it('rejects a negative value', () => {
    expect(validatePenaltyScoreShape(-1)).toBe(false);
  });

  it('rejects a value above 50', () => {
    expect(validatePenaltyScoreShape(51)).toBe(false);
  });

  it('rejects a non-integer value', () => {
    expect(validatePenaltyScoreShape(2.5)).toBe(false);
  });
});
