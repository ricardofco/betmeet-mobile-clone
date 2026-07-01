import { computeScore, type ScoreBreakdown } from '@/shared/scoring';
import type { Match } from '@/domain/competition';
import type { MyPrediction } from '@/domain/predictions/prediction-with-match';

/**
 * PREDICTIONS-5's score-breakdown display logic (model.md §3). This module
 * does **not** reimplement any scoring math — it only assembles
 * `computeScore`'s required `ScoringExample` input from a finished match +
 * the viewer's own prediction, and decides *when* a breakdown can be shown
 * at all. The actual points shown to the user always come from the
 * backend's persisted `PredictionScore` in production (system-context.md
 * §3: "the *authoritative* persisted score always comes from the backend");
 * this client-side recomputation exists only for **explanatory display**
 * (the same "why did I get 3 points" breakdown UI, computed instantly
 * without a network round-trip) — mirroring why the web app's educational
 * calculator and its real scoring engine both import the same function
 * (domain-overview.md §5.5).
 *
 * @invariant Never call `computeScore` with a match that isn't `FINISHED` —
 * `actualHome`/`actualAway` are not meaningful before then. Use
 * `canShowScoreBreakdown` as the gate.
 */

export type ScoreDisplayInput = {
  match: Pick<Match, 'status' | 'homeScore' | 'awayScore' | 'homePenaltyScore' | 'awayPenaltyScore'>;
  prediction: MyPrediction;
  isKnockout: boolean;
};

/**
 * A breakdown is only meaningful once the match has finished and both
 * actual scores are known — a `LIVE` match's score is not final (rankings'
 * live-projection concern, domain-overview.md §5.6, belongs to Bolt 9, not
 * here), and other statuses (SCHEDULED/POSTPONED/CANCELLED) have no score
 * data to derive from at all.
 */
export function canShowScoreBreakdown(
  match: Pick<Match, 'status' | 'homeScore' | 'awayScore'>,
): boolean {
  return match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null;
}

/**
 * Derives the actual penalty-shootout winner from the match's official
 * shootout score, using the same `derivePenaltyWinner` the scoring package
 * exposes (re-imported via `computeScore`'s module, not reimplemented).
 */
function deriveActualPenaltyWinner(
  match: Pick<Match, 'homePenaltyScore' | 'awayPenaltyScore'>,
): 'home' | 'away' | null {
  if (match.homePenaltyScore === null || match.awayPenaltyScore === null) return null;
  if (match.homePenaltyScore > match.awayPenaltyScore) return 'home';
  if (match.homePenaltyScore < match.awayPenaltyScore) return 'away';
  return null;
}

/**
 * Builds the `ScoreBreakdown` for one finished match + the viewer's own
 * prediction. Returns `null` if the match isn't finished yet (guarded by
 * `canShowScoreBreakdown` — callers should check that first; this function
 * still guards defensively rather than assuming a well-behaved caller).
 */
export function buildScoreBreakdown(input: ScoreDisplayInput): ScoreBreakdown | null {
  const { match, prediction, isKnockout } = input;

  if (!canShowScoreBreakdown(match) || match.homeScore === null || match.awayScore === null) {
    return null;
  }

  return computeScore({
    predictedHome: prediction.homeScore,
    predictedAway: prediction.awayScore,
    actualHome: match.homeScore,
    actualAway: match.awayScore,
    isKnockout,
    predictedPenaltyWinner: prediction.penaltyWinner,
    actualPenaltyWinner: deriveActualPenaltyWinner(match),
  });
}
