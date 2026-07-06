import { randomUUID } from 'node:crypto';
import { prisma } from '../../db';
import { computeScore, derivePenaltyWinner, type PenaltyWinner } from './compute-score';

function penaltyWinnerLabel(
  penaltyWinnerTeamId: string | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
): PenaltyWinner {
  if (!penaltyWinnerTeamId) return null;
  if (penaltyWinnerTeamId === homeTeamId) return 'home';
  if (penaltyWinnerTeamId === awayTeamId) return 'away';
  return null;
}

/** A match is scoreable only once FINISHED with both scores present (model.md §6). */
export function isMatchScoreable(match: {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}): boolean {
  return match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null;
}

/**
 * `scoreMatch(matchId)` — idempotent upsert of one `PredictionScore` row per
 * `Prediction` row tied to this match (global AND pool-override rows both,
 * model.md §6/design.md §4.3), fully overwriting from scratch on every call
 * (never additive, never partial). If the match is no longer scoreable
 * (reverted status or nulled score — Bolt 13's future concern), any existing
 * `PredictionScore` rows for it are deleted instead — scoring is not
 * "sticky." Safe to call any number of times: called by the lazy sweep
 * (`score-sweeper.ts`, ADR-050) and, in a future bolt, by an admin
 * rescoring trigger (model.md §0/ADR-050's consequence note) — never called
 * for a `LIVE` match (RANKINGS-3's live-projection path is structurally
 * separate and never persists, model.md §4 point 9).
 */
export async function scoreMatch(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { phase: true },
  });
  if (!match) return;

  if (!isMatchScoreable(match)) {
    await prisma.prediction_scores.deleteMany({ where: { match_id: matchId } });
    return;
  }

  const predictions = await prisma.prediction.findMany({ where: { matchId } });
  if (predictions.length === 0) return;

  const isKnockout = match.phase.type === 'KNOCKOUT';
  const actualPenaltyWinner =
    match.homePenaltyScore !== null && match.awayPenaltyScore !== null
      ? derivePenaltyWinner(match.homePenaltyScore, match.awayPenaltyScore)
      : null;

  await Promise.all(
    predictions.map(prediction => {
      const predictedPenaltyWinner = penaltyWinnerLabel(
        prediction.penaltyWinnerTeamId,
        match.homeTeamId,
        match.awayTeamId,
      );
      const breakdown = computeScore({
        predictedHome: prediction.homeScore,
        predictedAway: prediction.awayScore,
        actualHome: match.homeScore as number,
        actualAway: match.awayScore as number,
        isKnockout,
        predictedPenaltyWinner,
        actualPenaltyWinner,
      });

      const data = {
        matched_case: breakdown.matchedCase,
        base_points: breakdown.basePoints,
        penalty_applied: breakdown.penaltyApplied,
        penalty_points: breakdown.penaltyPoints,
        total_points: breakdown.totalPoints,
        scored_at: new Date(),
      };

      return prisma.prediction_scores.upsert({
        where: { prediction_id: prediction.id },
        create: {
          id: randomUUID(),
          prediction_id: prediction.id,
          match_id: match.id,
          user_id: prediction.userId,
          ...data,
        },
        update: data,
      });
    }),
  );
}
