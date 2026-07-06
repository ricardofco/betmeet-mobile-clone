import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';
import type { RankingRow } from '@/domain/rankings';

/**
 * Typed wrappers around `BackendApiClient.request()` for the `rankings.*`
 * capability group (design.md §4.1, ADR-048/050). Mirrors
 * `pools-api.ts`/`predictions-api.ts`'s exact pattern — same shared
 * `getBackendApiClient()` singleton, no new transport. Reachable from both
 * the host (`src/host/rankings/`) and the `pools` remote
 * (`src/remotes/pools/`) — both go through the one `getBackendApiClient()`
 * instance, itself an MF shared singleton.
 *
 * `RankingRow` carries raw totals only — no `position`/rank field. Dense
 * ranking + tie-break is computed mobile-side, at read time, via
 * `@/domain/rankings`'s `buildRankedView` (ADR-019 precedent: never cache a
 * derived, clock-dependent shape as the query result itself).
 */

export type GlobalRankingResponse = { ok: true; isLive: boolean; rows: RankingRow[] };

export type PoolLeaderboardResponse =
  | { ok: true; isLive: boolean; rows: RankingRow[] }
  | { ok: false; error: 'NOT_FOUND' | 'NOT_MEMBER' };

export const rankingsApi = {
  async getGlobalRanking(): Promise<GlobalRankingResponse> {
    return getBackendApiClient().request<GlobalRankingResponse>({
      capability: 'rankings.getGlobalRanking',
    });
  },

  async getPoolLeaderboard(poolId: string): Promise<PoolLeaderboardResponse> {
    return getBackendApiClient().request<PoolLeaderboardResponse, { poolId: string }>({
      capability: 'rankings.getPoolLeaderboard',
      body: { poolId },
    });
  },
};
