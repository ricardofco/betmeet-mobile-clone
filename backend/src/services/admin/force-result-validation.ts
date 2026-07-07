/**
 * ADMIN-4's server-side score-bounds check (design.md §6.2, model.md §5) —
 * genuinely independent of `prediction-eligibility.ts`'s
 * `validateScoreBounds` (0-20): an admin-forced result is a materially
 * wider input space than a user's plausible-score guess, so this bolt does
 * NOT reuse that bound. `validatePenaltyWinnerRule` (from
 * `prediction-eligibility.ts`) IS reused unchanged for the penalty-winner-
 * iff-tied-knockout rule (design.md §6.2) — only the score bound itself is
 * new here.
 */
export function validateForceResultScoreBounds(homeScore: number, awayScore: number): boolean {
  return (
    Number.isInteger(homeScore) &&
    Number.isInteger(awayScore) &&
    homeScore >= 0 &&
    homeScore <= 50 &&
    awayScore >= 0 &&
    awayScore <= 50
  );
}

/** Penalty-shootout scores, when supplied, must be non-negative integers — a
 * light robustness check independent of `derivePenaltyWinner`'s own
 * tied-shootout-returns-null behavior (BR-7.16's cross-check, done by the
 * caller against the submitted `penaltyWinnerTeamId`, not here). */
export function validatePenaltyScoreShape(penaltyScore: number): boolean {
  return Number.isInteger(penaltyScore) && penaltyScore >= 0 && penaltyScore <= 50;
}
