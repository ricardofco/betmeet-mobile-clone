/**
 * Canonical scoring constants — the single source of truth shared by the
 * educational calculator (unit-09-education) and the authoritative scoring
 * engine (unit-07-scoring-rankings).
 *
 * @invariant Neither unit defines its own constants; both import this module
 * so education and real scoring can never diverge. Origin: BR-2.7 (betmeet
 * web app), preserved in mobile port per domain-overview.md §5.5.
 *
 * See ADR-016 (memory-bank/bolts/bolt-4-scoring-package/adr-016-scoring-
 * duplicate-detection-gate.md) for the code-review gate that enforces this.
 */
export const ScoringRuleSet = {
  /** Exact score (home and away) correct. Does not stack with result/goal components. */
  EXACT_SCORE: 5,
  /** Correct result (winner or draw) on a non-exact prediction. Adds to goal components. */
  CORRECT_RESULT: 2,
  /**
   * Correct goal count for one team. Adds to result component.
   * Both home and away goals can match independently (domain-overview.md §5.5).
   */
  PARTIAL_GOAL_COUNT: 1,
  /** Nothing correct. */
  MISS: 0,
  /** Bonus for predicting the penalty-shootout winner in a tied knockout match. */
  PENALTY_BONUS: 1,
} as const;

export type ScoringRuleSet = typeof ScoringRuleSet;
