import { useQuery } from '@tanstack/react-query';
import { adminApi, type ListAdminMatchesResponse } from '@/platform/backend-api/admin-api';

/**
 * ADMIN-4/5's match picker (design.md §5.2/§12) — ONE fetch, `select`-
 * filtered per screen via `@/domain/admin`'s two pure filters
 * (`matchesEligibleForForceResult`/`matchesWithActiveOverride`), same
 * "derive at read time" precedent as `buildRankedView` (ADR-019). Both
 * `ForceResultScreen` and `RevertOverrideScreen` share this one query key —
 * a mutation on either screen invalidates the same cached list for both.
 */
export const ADMIN_MATCH_LIST_QUERY_KEY = ['admin', 'matches'] as const;

export function useAdminMatchListQuery() {
  return useQuery<ListAdminMatchesResponse>({
    queryKey: ADMIN_MATCH_LIST_QUERY_KEY,
    queryFn: () => adminApi.listMatches(),
  });
}
