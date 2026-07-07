import { useQuery } from '@tanstack/react-query';
import { adminApi, type CheckAccessResponse } from '@/platform/backend-api/admin-api';

/**
 * ADMIN-1's `AdminHomeScreen` mount-time re-check (design.md §2.2 point 2,
 * ADR-059) — calls the SAME `admin.checkAccess` capability the host's
 * Settings-row check already called, but independently: its own query
 * instance, its own query key, deliberately NOT sharing the host's cached
 * result (design.md §12: "own independent call to the same capability, own
 * query instance — not shared cache with the host's"). This is the second
 * of ADMIN-1's two client-side enforcement points (defense-in-depth,
 * mobile side) — the real authority stays entirely server-side regardless
 * (`requireAdmin()`, re-checked fresh on every `admin.*` handler call).
 */
export const ADMIN_ACCESS_QUERY_KEY_REMOTE_ENTRY = ['admin', 'checkAccessRemoteEntry'] as const;

export function useAdminAccessQuery() {
  return useQuery<CheckAccessResponse>({
    queryKey: ADMIN_ACCESS_QUERY_KEY_REMOTE_ENTRY,
    queryFn: () => adminApi.checkAccess(),
    staleTime: 0,
  });
}
