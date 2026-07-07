import {
  validateForceResultReason,
  validateForceResultScoreBounds,
} from '@/domain/admin/force-result-validation';
import { validatePredictionEntry } from '@/domain/predictions/prediction-entry-validation';

describe('validateForceResultScoreBounds (ADMIN-4, design.md §14 — 0-50, independent of predictions 0-20)', () => {
  it('accepts an in-range score', () => {
    expect(validateForceResultScoreBounds(2, 1)).toBe(true);
  });

  it('accepts the boundary values 0 and 50', () => {
    expect(validateForceResultScoreBounds(0, 50)).toBe(true);
    expect(validateForceResultScoreBounds(50, 0)).toBe(true);
  });

  it('rejects a negative score', () => {
    expect(validateForceResultScoreBounds(-1, 0)).toBe(false);
    expect(validateForceResultScoreBounds(0, -1)).toBe(false);
  });

  it('rejects a score above 50', () => {
    expect(validateForceResultScoreBounds(51, 0)).toBe(false);
    expect(validateForceResultScoreBounds(0, 51)).toBe(false);
  });

  it('rejects a non-integer score', () => {
    expect(validateForceResultScoreBounds(1.5, 1)).toBe(false);
    expect(validateForceResultScoreBounds(1, 1.5)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // THE regression design.md §14 explicitly names: a score in the 21-50
  // range must PASS force-result's own 0-50 bound while FAILING predictions'
  // own 0-20 bound (`validatePredictionEntry`) — proving the two bounds are
  // genuinely independent, not accidentally sharing one constant.
  // -------------------------------------------------------------------------
  it('REGRESSION: a score >20 but <=50 passes here but would fail predictions own 0-20 bound', () => {
    expect(validateForceResultScoreBounds(25, 0)).toBe(true);

    const predictionResult = validatePredictionEntry(
      { homeScore: 25, awayScore: 0, penaltyWinner: null },
      false,
    );
    expect(predictionResult.valid).toBe(false);
  });

  it('rejects a score just past the 50 boundary (51) even though it would already have failed predictions too', () => {
    expect(validateForceResultScoreBounds(51, 0)).toBe(false);
  });
});

describe('validateForceResultReason (BR-7.2 — 1-500 chars, trimmed)', () => {
  it('rejects an empty reason', () => {
    expect(validateForceResultReason('')).toBe(false);
  });

  it('rejects a whitespace-only reason', () => {
    expect(validateForceResultReason('   ')).toBe(false);
  });

  it('accepts a single-character reason', () => {
    expect(validateForceResultReason('x')).toBe(true);
  });

  it('accepts exactly 500 characters', () => {
    expect(validateForceResultReason('a'.repeat(500))).toBe(true);
  });

  it('rejects 501 characters', () => {
    expect(validateForceResultReason('a'.repeat(501))).toBe(false);
  });

  it('trims surrounding whitespace before measuring length', () => {
    expect(validateForceResultReason(`  ${'a'.repeat(500)}  `)).toBe(true);
    expect(validateForceResultReason(`  ${'a'.repeat(501)}  `)).toBe(false);
  });
});
