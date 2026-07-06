/**
 * Rankings' core data shapes (model.md §1/§7, design.md §2/§4.1). Mirrors
 * `src/domain/pools/pool.ts`'s "raw backend DTO in, richer display shape
 * out" pattern — `RankingRow` is the raw shape the backend's
 * `rankings.getGlobalRanking`/`rankings.getPoolLeaderboard` capabilities
 * return (design.md §4.1's `RankingRowDTO`, field-for-field), `RankedRow`/
 * `ProjectedRow` are what `rank-projection.ts`'s `buildRankedView` derives
 * from it at read time (ADR-019 precedent — never cache the derived shape
 * itself).
 */

/** Raw leaderboard row as returned by the backend — no position/rank field
 * (design.md §4.1: dense-ranking/tie-break is computed mobile-side). */
export type RankingRow = {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  /** `auth.userId === row.userId`, computed server-side. */
  isViewer: boolean;
  /** `SUM(PredictionScore.totalPoints)` for this user in this scope. */
  confirmedTotal: number;
  /**
   * `confirmedTotal + livePoints` — `null` whenever the response's `isLive`
   * is `false` (an all-or-none field across every row in one response, not
   * per-row — model.md §4).
   */
  projectedTotal: number | null;
  /**
   * `false` only for a live-only synthesized row (model.md §4 point 6) —
   * a user with zero confirmed scored predictions who has an in-progress
   * LIVE prediction. Always `true` for pool-scope rows, since every pool
   * member already appears (model.md §3).
   */
  hasConfirmedEntry: boolean;
};

/** A `RankingRow` after dense-ranking (model.md §5) has been applied. */
export type RankedRow = RankingRow & {
  position: number;
  isTied: boolean;
};

/**
 * A `RankedRow` re-ranked by `projectedTotal` (model.md §4 point 7) — the
 * `position` field here IS the projected position; the original confirmed
 * position is preserved separately as `previousPosition`, never overwritten
 * (model.md §4 point 8).
 */
export type ProjectedRow = RankedRow & {
  /** `null` for a synthesized row with no confirmed-pass position (model.md §4 point 6). */
  previousPosition: number | null;
  /** `previousPosition - position` (projected position). `null` when `previousPosition` is `null`. */
  positionDelta: number | null;
};
