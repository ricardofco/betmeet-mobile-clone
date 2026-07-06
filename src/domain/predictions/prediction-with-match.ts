import type { Match } from '@/domain/competition';
import type { PenaltyWinner } from '@/shared/scoring';
import type { PointsStatus } from '@/domain/rankings';

/**
 * The prediction-joined fixture shape — mobile's equivalent of the backend's
 * `getFixtureWithMyPredictions` (system-context.md §3, explicitly out of
 * Bolt 5's scope — see `competition-api.ts`'s doc comment). One row per
 * match, with the viewer's own prediction (if any) attached; never another
 * user's (anti-bias — `domain-overview.md §5.3` — is a *pool member-list*
 * rule, not applicable here since this is always "my own" prediction).
 */
export type MyPrediction = {
  id: string;
  matchId: string;
  poolId: string | null;
  homeScore: number;
  awayScore: number;
  penaltyWinner: PenaltyWinner;
  /**
   * Bolt 10 (design.md §8) — additive, backend-authoritative field: "has
   * this been durably scored yet." Distinct from, and does not replace,
   * `canShowScoreBreakdown`/`buildScoreBreakdown`'s existing client-side
   * recomputation (still the source for the breakdown panel itself).
   */
  pointsStatus: PointsStatus;
};

export type MatchWithMyPrediction = {
  match: Match;
  /** `null` when the viewer hasn't predicted this match yet. */
  prediction: MyPrediction | null;
  /** True for knockout-phase matches — drives the penalty-winner selector gate. */
  isKnockout: boolean;
};
