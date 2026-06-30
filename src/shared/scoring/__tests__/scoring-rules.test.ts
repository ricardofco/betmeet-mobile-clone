import { ScoringRuleSet } from '@/shared/scoring/scoring-rules';

/**
 * Sanity-check the canonical point constants.
 *
 * These tests are not redundant: a constant changing silently (e.g. during a
 * merge or refactor) is a product defect. Pin the values explicitly so any
 * accidental change surfaces as a failing test before it ships.
 *
 * Source: domain-overview.md §5.5, betmeet-clone scoring-rules.ts.
 */
describe('ScoringRuleSet — point constants (domain-overview.md §5.5)', () => {
  it('EXACT_SCORE is 5', () => {
    expect(ScoringRuleSet.EXACT_SCORE).toBe(5);
  });

  it('CORRECT_RESULT is 2', () => {
    expect(ScoringRuleSet.CORRECT_RESULT).toBe(2);
  });

  it('PARTIAL_GOAL_COUNT is 1', () => {
    expect(ScoringRuleSet.PARTIAL_GOAL_COUNT).toBe(1);
  });

  it('MISS is 0', () => {
    expect(ScoringRuleSet.MISS).toBe(0);
  });

  it('PENALTY_BONUS is 1', () => {
    expect(ScoringRuleSet.PENALTY_BONUS).toBe(1);
  });

  it('maximum possible total without penalty bonus is EXACT_SCORE (5)', () => {
    // Max non-exact is 3 (result + one side). EXACT_SCORE (5) is greater than
    // any additive combination — this relation is load-bearing for UI display.
    expect(ScoringRuleSet.EXACT_SCORE).toBeGreaterThan(
      ScoringRuleSet.CORRECT_RESULT + ScoringRuleSet.PARTIAL_GOAL_COUNT,
    );
  });

  it('maximum possible total with penalty bonus is 6 (EXACT_SCORE + PENALTY_BONUS)', () => {
    expect(ScoringRuleSet.EXACT_SCORE + ScoringRuleSet.PENALTY_BONUS).toBe(6);
  });
});
