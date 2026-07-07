import { prisma } from '../../db';
import { scoreMatch } from './score-match';
import { recordSweepRun } from './sweep-status';

/**
 * The lazy-sweep backstop (ADR-050) — this backend has no competition-sync
 * cron (model.md §6/ADR-050's context), so `rankings.getGlobalRanking`,
 * `rankings.getPoolLeaderboard`, and `predictions.getMyPredictions`
 * (design.md §4.2) all call this before reading, guaranteeing freshness at
 * read time rather than on a fixed schedule.
 *
 * An efficient, idempotent, targeted scan: every `FINISHED` match with both
 * scores present that still has at least one prediction missing its
 * `PredictionScore` row. Safe to call on every read — the common case (no
 * stale matches) is a single indexed query with nothing further to do.
 */
export async function sweepFinishedUnscoredMatches(): Promise<number> {
  const staleMatches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: { some: { prediction_scores: null } },
    },
    select: { id: true },
  });

  for (const match of staleMatches) {
    await scoreMatch(match.id);
  }

  // Bolt 13 (design.md §1.2/ADR-058) — one additive line, right before the
  // existing return: records the TRUE last invocation of this backstop,
  // regardless of which caller triggered it, so ADMIN-2/3's merged screen
  // can answer "when did this app's rescoring backstop last actually run."
  // Does not change this function's own behavior otherwise.
  recordSweepRun(staleMatches.length);

  return staleMatches.length;
}
