import { useQuery } from '@tanstack/react-query';
import { rankingsApi, type GlobalRankingResponse } from '@/platform/backend-api/rankings-api';
import { buildRankedView, type RankedView } from '@/domain/rankings';

/**
 * RANKINGS-1 (design.md §7.1/§9) — one flat TanStack Query key, mirroring
 * `MY_PREDICTIONS_QUERY_KEY`'s "one flat key" precedent (ADR-019).
 */
export const GLOBAL_RANKING_QUERY_KEY = ['rankings', 'global'] as const;

/** Short-poll interval while the last known response says `isLive`
 * (design.md §7.3) — a plain `refetchInterval`, not a fork of
 * `useLiveCompetitionSubscription` (ADR-025 precedent: duplicating ~10 lines
 * of polling config is cheaper and safer than forking a
 * Realtime-subscription hook for a secondary, non-primary-live-experience
 * screen). */
const LIVE_REFRESH_INTERVAL_MS = 20_000;

export type GlobalRankingView = RankedView & { isLive: boolean };

/**
 * Fetches the raw `RankingRow[]` and applies `buildRankedView` client-side
 * via `select` (ADR-019 precedent: never cache a derived, clock-dependent
 * shape as the query result itself — re-sorting the same raw payload is
 * free, and the raw payload is what's actually cacheable).
 */
export function useGlobalRankingQuery() {
  return useQuery<GlobalRankingResponse, unknown, GlobalRankingView>({
    queryKey: GLOBAL_RANKING_QUERY_KEY,
    queryFn: () => rankingsApi.getGlobalRanking(),
    select: response => ({ ...buildRankedView(response.rows), isLive: response.isLive }),
    refetchInterval: query => (query.state.data?.isLive ? LIVE_REFRESH_INTERVAL_MS : false),
  });
}
