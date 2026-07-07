import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  type ForceMatchResultInput,
  type ForceMatchResultResponse,
} from '@/platform/backend-api/admin-api';
import { ADMIN_MATCH_LIST_QUERY_KEY } from '@/remotes/admin/hooks/use-admin-match-list-query';

/** ADMIN-4 (design.md §5.2/§6.2) — invalidates the shared match-list query
 * on success so both pickers reflect the newly-forced result immediately. */
export function useForceResultMutation() {
  const queryClient = useQueryClient();
  return useMutation<ForceMatchResultResponse, unknown, ForceMatchResultInput>({
    mutationFn: input => adminApi.forceMatchResult(input),
    onSuccess: response => {
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ADMIN_MATCH_LIST_QUERY_KEY });
      }
    },
  });
}
