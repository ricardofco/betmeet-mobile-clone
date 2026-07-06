import { useQuery } from '@tanstack/react-query';
import { rankingsApi, type PoolLeaderboardResponse } from '@/platform/backend-api/rankings-api';
import { buildRankedView, type RankedView } from '@/domain/rankings';

/**
 * RANKINGS-2 (design.md §7.2) — a parameterized key, same precedent as
 * `usePoolDetailQuery`/`usePoolMemberPredictionsQuery` (Bolt 7/8).
 */
export const poolLeaderboardQueryKey = (poolId: string) => ['pools', 'leaderboard', poolId] as const;

const LIVE_REFRESH_INTERVAL_MS = 20_000;

export type PoolLeaderboardView =
  | ({ ok: true } & RankedView & { isLive: boolean })
  | { ok: false; error: 'NOT_FOUND' | 'NOT_MEMBER' };

/**
 * `select`-applies `buildRankedView` identically to the host's
 * `useGlobalRankingQuery` (design.md §7.2 — literally the same function
 * reference, imported from `@/domain/rankings`, not a re-implementation).
 * Called directly through `rankingsApi` (the platform seam) — no import
 * from `src/host/rankings/` (same ADR-036/037 discipline every other
 * `pools`-remote hook already follows).
 */
export function usePoolLeaderboardQuery(poolId: string) {
  return useQuery<PoolLeaderboardResponse, unknown, PoolLeaderboardView>({
    queryKey: poolLeaderboardQueryKey(poolId),
    queryFn: () => rankingsApi.getPoolLeaderboard(poolId),
    enabled: poolId.length > 0,
    select: response => {
      if (!response.ok) return response;
      return { ok: true, ...buildRankedView(response.rows), isLive: response.isLive };
    },
    refetchInterval: query => {
      const data = query.state.data;
      return data?.ok && data.isLive ? LIVE_REFRESH_INTERVAL_MS : false;
    },
  });
}
