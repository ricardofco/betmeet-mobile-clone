import { useQuery } from '@tanstack/react-query';
import { adminApi, type CheckAccessResponse } from '@/platform/backend-api/admin-api';

/**
 * ADMIN-1's Settings-row visibility check (design.md §2.2 point 1, ADR-059)
 * — an advisory-only, UX-nicety check: hides the Admin row from the ~100%
 * of users who aren't the seeded `ADMIN` account, but is never the real
 * authorization boundary (that's `requireAdmin()`, re-checked fresh
 * server-side on every `admin.*` call).
 *
 * `staleTime: 0` deliberately — this is a security-adjacent boolean, not a
 * long-cache-lived snapshot like `profile.getProfile` (design.md §3.1's
 * "caching correctness" reasoning for keeping this its own capability).
 *
 * Uses its OWN query key, distinct from the `admin` remote's own
 * `AdminHomeScreen` re-check (`use-admin-access-query.ts` there) — design.md
 * §12 is explicit that the remote's mount-time re-check is "own independent
 * call... own query instance — not shared cache with the host's." Two
 * physically separate hooks (duplicated, not shared — same precedent as
 * `render-with-query-client.tsx`'s per-bundle duplication) calling the same
 * one capability.
 */
export const ADMIN_ACCESS_QUERY_KEY_SETTINGS_ROW = ['admin', 'checkAccessSettingsRow'] as const;

export function useAdminAccessQuery() {
  return useQuery<CheckAccessResponse>({
    queryKey: ADMIN_ACCESS_QUERY_KEY_SETTINGS_ROW,
    queryFn: () => adminApi.checkAccess(),
    staleTime: 0,
  });
}
