import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type RevertMatchOverrideResponse } from '@/platform/backend-api/admin-api';
import { ADMIN_MATCH_LIST_QUERY_KEY } from '@/remotes/admin/hooks/use-admin-match-list-query';

/** ADMIN-5 (design.md §5.2/§6.2, ADR-061) — invalidates the shared
 * match-list query on success. `matchId` is the ONLY field sent to the
 * backend — the type-to-confirm UI device (`revert-confirm-form.tsx`) is
 * purely client-side and never travels in this request body. */
export function useRevertOverrideMutation() {
  const queryClient = useQueryClient();
  return useMutation<RevertMatchOverrideResponse, unknown, string>({
    mutationFn: matchId => adminApi.revertMatchOverride(matchId),
    onSuccess: response => {
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ADMIN_MATCH_LIST_QUERY_KEY });
      }
    },
  });
}
