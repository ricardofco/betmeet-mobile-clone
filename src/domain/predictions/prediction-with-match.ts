import type { Match } from '@/domain/competition';
import type { PenaltyWinner } from '@/shared/scoring';

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
};

export type MatchWithMyPrediction = {
  match: Match;
  /** `null` when the viewer hasn't predicted this match yet. */
  prediction: MyPrediction | null;
  /** True for knockout-phase matches — drives the penalty-winner selector gate. */
  isKnockout: boolean;
};
