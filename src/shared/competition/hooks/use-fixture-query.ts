import { useQuery, useQueryClient } from '@tanstack/react-query';
import { competitionApi } from '@/platform/backend-api/competition-api';
import { buildFixtureView, type FixtureView, type Match } from '@/domain/competition';

/**
 * The one TanStack Query key for the flat, ungrouped fixture list
 * (design.md §3.1, ADR-019). Every consumer of competition fixture data —
 * the Predictions screen (Bolt 6), a future standalone fixture-browse
 * screen, etc. — reads through this same key, so a live-signal-triggered
 * `invalidateQueries` refreshes every mounted consumer at once with no
 * duplicate network requests (mirrors `use-profile-query.ts`'s
 * `PROFILE_QUERY_KEY` precedent).
 */
export const FIXTURE_QUERY_KEY = ['competition', 'fixture'] as const;

/**
 * Returns the raw, ungrouped match list. Callers that need the
 * day-partitioned `FixtureView` should use `useFixtureView`, not this hook
 * directly — this hook exists for callers (e.g.
 * `use-live-competition-subscription.ts`'s relevance check) that only need
 * the flat list.
 */
export function useFixtureQuery() {
  return useQuery<Match[]>({
    queryKey: FIXTURE_QUERY_KEY,
    queryFn: () => competitionApi.getFixture(),
  });
}

/**
 * Derives `FixtureView` (day-grouped, linger-window-applied) from the flat
 * fixture query. ADR-019: this is computed at **read time**, against `now`
 * passed in by the caller — never cached as the query's stored value, since
 * the linger-window decision depends on the viewer's clock, not on
 * server-returned data. Callers should pass a fresh `now` (e.g.
 * `new Date().toISOString()`) on every render that should reflect the
 * current instant — this hook does not memoize across time on its own.
 */
export function useFixtureView(now: string): { view: FixtureView | undefined; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useFixtureQuery();
  const view = data ? buildFixtureView(data, now) : undefined;
  return { view, isLoading, error };
}

/** Invalidates the shared fixture query — the one path live-signal handling and any future mutation-adjacent flow should use. */
export function useInvalidateFixtureQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FIXTURE_QUERY_KEY });
}
