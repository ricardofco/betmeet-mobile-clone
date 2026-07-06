/**
 * Pure scoring function — shared by unit-05-predictions (display),
 * unit-07-scoring-rankings (ranking context), unit-09-education (interactive
 * calculator), and unit-10-admin (penalty-winner validation).
 *
 * @invariant This file is the only place in the repository that implements
 * score computation logic. No other unit may define its own EXACT_SCORE /
 * CORRECT_RESULT / PARTIAL_GOAL_COUNT / PENALTY_BONUS constants or a local
 * computeScore-equivalent function. See ADR-016 for the code-review gate.
 *
 * Algorithm source: domain-overview.md §5.5 (mobile spec) and
 * betmeet-clone/src/features/scoring/compute-score.ts (verified reference).
 * The two are in full agreement — no reconciliation was needed (unlike Bolt
 * 3's ADR-011 nickname-cooldown case).
 *
 * @invariant (Bolt 10, ADR-051) — `backend/src/services/scoring/compute-score.ts`
 * is a fresh, independent backend-side port of this same algorithm (the
 * standalone `backend/` Node project cannot import this file — see ADR-030).
 * This is a deliberate, ADR-recorded "twin invariant": any change to scoring
 * rules here must also be made there, verified via the shared fixture-based
 * test-case list both suites reference. See ADR-016 and ADR-051 for the full
 * record.
 */
import { ScoringRuleSet } from './scoring-rules';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MatchedCase = 'EXACT' | 'RESULT' | 'PARTIAL' | 'MISS';

/**
 * The penalty-shootout winner, always derived from the shootout score via
 * `derivePenaltyWinner()` — never accepted as a raw separate user input.
 * `null` means either no shootout occurred or the shootout score was tied
 * (an invalid state; a shootout cannot end level).
 */
export type PenaltyWinner = 'home' | 'away' | null;

/** Input to `computeScore`. All numeric values are non-negative integers. */
export interface ScoringExample {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  /** True for knockout-stage matches where a penalty shootout is possible. */
  isKnockout: boolean;
  /**
   * The penalty-shootout winner the user predicted.
   * Must be produced by `derivePenaltyWinner()`, never raw input.
   * Ignored (no bonus) unless the match is knockout and the regular/ET score is tied.
   */
  predictedPenaltyWinner?: PenaltyWinner;
  /**
   * The actual penalty-shootout winner for this match.
   * Must be produced by `derivePenaltyWinner()` from the official shootout score.
   */
  actualPenaltyWinner?: PenaltyWinner;
}

/** Output of `computeScore`. */
export interface ScoreBreakdown {
  matchedCase: MatchedCase;
  basePoints: number;
  penaltyApplied: boolean;
  penaltyPoints: number;
  totalPoints: number;
  /**
   * i18n key describing the outcome — identical to `matchedCase` so UI
   * components can key their copy off a single discriminant.
   */
  explanationKey: MatchedCase;
  /**
   * Additive component breakdown for non-exact predictions. Absent when
   * `matchedCase === 'EXACT'` (the exact-match short-circuit fires first and
   * the components are not computed).
   */
  components?: {
    resultPoints: number;
    homeGoalPoints: number;
    awayGoalPoints: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derives the penalty-shootout winner from the shootout score.
 *
 * This is the **only** way a `PenaltyWinner` value should ever be produced
 * in this codebase — both for user predictions (before submission) and for
 * admin-entered results (domain-overview.md §5.5, §5.7).
 *
 * A tied shootout score is an invalid state (a shootout cannot end level),
 * so it returns `null`.
 */
export function derivePenaltyWinner(
  homeShootoutGoals: number,
  awayShootoutGoals: number,
): PenaltyWinner {
  if (homeShootoutGoals > awayShootoutGoals) return 'home';
  if (homeShootoutGoals < awayShootoutGoals) return 'away';
  return null;
}

/**
 * Computes the point breakdown for a single prediction against an actual result.
 *
 * Algorithm (domain-overview.md §5.5):
 *
 * 1. Exact match short-circuit — if predicted score equals actual score
 *    exactly → EXACT (5 pts), no component breakdown, done.
 *
 * 2. Additive components (non-exact only):
 *    - +2 if predicted result (home win / draw / away win) matches actual
 *    - +1 if predicted home goal count matches actual home goal count
 *    - +1 if predicted away goal count matches actual away goal count
 *    Max non-exact base is 3 (result + one side). Result + both sides = exact
 *    (caught by step 1 — the two cases never overlap).
 *
 * 3. Penalty bonus (+1, independent of steps 1 & 2): applies only when the
 *    match is knockout, the regular/ET score is tied, a predicted shootout
 *    winner was supplied, and it matches the actual shootout winner.
 */
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
    const resultPoints =
      predictedResult === actualResult ? ScoringRuleSet.CORRECT_RESULT : 0;
    const homeGoalPoints =
      predictedHome === actualHome ? ScoringRuleSet.PARTIAL_GOAL_COUNT : 0;
    const awayGoalPoints =
      predictedAway === actualAway ? ScoringRuleSet.PARTIAL_GOAL_COUNT : 0;

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
    explanationKey: matchedCase,
    ...(components !== undefined ? { components } : {}),
  };
}
