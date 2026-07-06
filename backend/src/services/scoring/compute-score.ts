/**
 * Backend-side port of the scoring algorithm — a "twin invariant" alongside
 * ADR-016 (mobile `src/shared/scoring/compute-score.ts`), recorded in full at
 * `memory-bank/bolts/bolt-10-scoring-rankings/adr-051-backend-computescore-port-twin-invariant.md`.
 *
 * `backend/` is a standalone Node/Express project (own `package.json`, own
 * `tsconfig.json` with `rootDir: "src"`) with no code-sharing mechanism to
 * mobile's `src/` — per ADR-030, every backend business rule is
 * reimplemented fresh against the spec, never imported from mobile `src/`.
 * This file follows that already-established convention; it is not a new
 * one.
 *
 * @invariant This file's rule content MUST stay in sync with
 * `src/shared/scoring/compute-score.ts` (ADR-016's original single-source
 * invariant, mobile-side). Any change to scoring rules (a new bonus type, a
 * changed point value, a new tie condition) must touch BOTH files in the
 * same PR, verified against the shared fixture-based test-case list both
 * suites reference (ADR-051) — most importantly the tied-LIVE-match,
 * differing-`penaltyWinnerTeamId`-picks regression case (model.md §4 point
 * 5 / design.md §11): both users must get identical `totalPoints` when
 * `actualPenaltyWinner` is `null`, no bonus to either.
 *
 * Algorithm source: domain-overview.md §5.5 (mobile spec), verified against
 * `src/shared/scoring/compute-score.ts`.
 */

export const ScoringRuleSet = {
  /** Exact score (home and away) correct. Does not stack with result/goal components. */
  EXACT_SCORE: 5,
  /** Correct result (winner or draw) on a non-exact prediction. Adds to goal components. */
  CORRECT_RESULT: 2,
  /** Correct goal count for one team. Adds to result component. Both sides can match independently. */
  PARTIAL_GOAL_COUNT: 1,
  /** Nothing correct. */
  MISS: 0,
  /** Bonus for predicting the penalty-shootout winner in a tied knockout match. */
  PENALTY_BONUS: 1,
} as const;

export type MatchedCase = 'EXACT' | 'RESULT' | 'PARTIAL' | 'MISS';

/**
 * The penalty-shootout winner, always derived from the shootout score via
 * `derivePenaltyWinner()` below — a tied shootout score is an invalid state
 * and returns `null`.
 */
export type PenaltyWinner = 'home' | 'away' | null;

export interface ScoringExample {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  /** True for knockout-stage matches where a penalty shootout is possible. */
  isKnockout: boolean;
  /** The penalty-shootout winner the user predicted. Ignored unless the match is knockout and tied. */
  predictedPenaltyWinner?: PenaltyWinner;
  /**
   * The actual penalty-shootout winner. MUST be `null` whenever the source
   * match is `LIVE` (model.md §4 point 5, ADR-051 headline regression case)
   * — there is no shootout data at all while a match is in progress, so any
   * derivation from a live/partial scoreboard would be fabricating a result.
   */
  actualPenaltyWinner?: PenaltyWinner;
}

export interface ScoreBreakdown {
  matchedCase: MatchedCase;
  basePoints: number;
  penaltyApplied: boolean;
  penaltyPoints: number;
  totalPoints: number;
  components?: {
    resultPoints: number;
    homeGoalPoints: number;
    awayGoalPoints: number;
  };
}

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * Derives the penalty-shootout winner from the shootout score — the only way
 * a `PenaltyWinner` value should ever be produced backend-side, mirroring
 * mobile's own `derivePenaltyWinner()`.
 */
export function derivePenaltyWinner(homeShootoutGoals: number, awayShootoutGoals: number): PenaltyWinner {
  if (homeShootoutGoals > awayShootoutGoals) return 'home';
  if (homeShootoutGoals < awayShootoutGoals) return 'away';
  return null;
}

/** Computes the point breakdown for a single prediction against an actual result. See mobile's `compute-score.ts` doc comment for the full algorithm write-up (identical here). */
export function computeScore(example: ScoringExample): ScoreBreakdown {
  const { predictedHome, predictedAway, actualHome, actualAway } = example;

  const predictedResult = sign(predictedHome - predictedAway);
  const actualResult = sign(actualHome - actualAway);

  let matchedCase: MatchedCase;
  let basePoints: number;
  let components:
    | { resultPoints: number; homeGoalPoints: number; awayGoalPoints: number }
    | undefined;

  // Step 1 — exact-match short-circuit
  if (predictedHome === actualHome && predictedAway === actualAway) {
    matchedCase = 'EXACT';
    basePoints = ScoringRuleSet.EXACT_SCORE;
  } else {
    // Step 2 — additive components
    const resultPoints = predictedResult === actualResult ? ScoringRuleSet.CORRECT_RESULT : 0;
    const homeGoalPoints = predictedHome === actualHome ? ScoringRuleSet.PARTIAL_GOAL_COUNT : 0;
    const awayGoalPoints = predictedAway === actualAway ? ScoringRuleSet.PARTIAL_GOAL_COUNT : 0;

    basePoints = resultPoints + homeGoalPoints + awayGoalPoints;

    if (resultPoints > 0) {
      matchedCase = 'RESULT';
    } else if (homeGoalPoints > 0 || awayGoalPoints > 0) {
      matchedCase = 'PARTIAL';
    } else {
      matchedCase = 'MISS';
    }

    components = { resultPoints, homeGoalPoints, awayGoalPoints };
  }

  // Step 3 — penalty bonus (independent)
  let penaltyApplied = false;
  let penaltyPoints = 0;

  if (
    example.isKnockout &&
    actualHome === actualAway &&
    example.predictedPenaltyWinner != null &&
    example.predictedPenaltyWinner === example.actualPenaltyWinner
  ) {
    penaltyApplied = true;
    penaltyPoints = ScoringRuleSet.PENALTY_BONUS;
  }

  return {
    matchedCase,
    basePoints,
    penaltyApplied,
    penaltyPoints,
    totalPoints: basePoints + penaltyPoints,
    ...(components !== undefined ? { components } : {}),
  };
}
