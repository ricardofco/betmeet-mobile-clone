/**
 * The per-match, across-all-members override-or-global resolver rankings
 * needs and no existing backend code provides (model.md §7, design.md §3).
 *
 * Bolt 8's `getMemberPredictions` handler fetches both a member's override
 * and global rows for its grid but deliberately keeps both visible (a
 * `hasGlobal` flag, for display) — it never collapses them into one
 * point-contributing row. Rankings needs the opposite: for every
 * (member, match) pair in a pool, pick EXACTLY ONE effective prediction
 * (the pool-scoped override if one exists, else the member's global
 * prediction, else none) before summing points. Reused by both the pool
 * leaderboard's confirmed-total aggregation and its live-projection
 * augmentation (`handlers.ts`'s `rankings.getPoolLeaderboard`) — one
 * implementation, two callers.
 */
export type EffectivePredictionRow = {
  id: string;
  userId: string;
  matchId: string;
  poolId: string | null;
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
};

/**
 * Groups `rows` by `(userId, matchId)`; for each pair, prefers the row whose
 * `poolId === poolId` (the pool-scoped override), falling back to the row
 * whose `poolId === null` (the member's global prediction). A pair with
 * neither is simply absent from the result — the member never predicted
 * that match, contributing 0 (model.md §3's "member with 0 scored
 * predictions still appears, at 0 points").
 */
export function resolveEffectivePredictions(
  rows: readonly EffectivePredictionRow[],
  poolId: string,
): Map<string, EffectivePredictionRow> {
  const byKey = new Map<string, { override?: EffectivePredictionRow; global?: EffectivePredictionRow }>();

  for (const row of rows) {
    const key = `${row.userId}::${row.matchId}`;
    const entry = byKey.get(key) ?? {};
    if (row.poolId === poolId) {
      entry.override = row;
    } else if (row.poolId === null) {
      entry.global = row;
    }
    byKey.set(key, entry);
  }

  const result = new Map<string, EffectivePredictionRow>();
  for (const [key, entry] of byKey) {
    const effective = entry.override ?? entry.global;
    if (effective) result.set(key, effective);
  }
  return result;
}
