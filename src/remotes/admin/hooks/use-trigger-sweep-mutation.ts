import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type TriggerSweepResponse } from '@/platform/backend-api/admin-api';
import { SWEEP_STATUS_QUERY_KEY } from '@/remotes/admin/hooks/use-sweep-status-query';

/** ADMIN-3, narrowed (design.md §1.2/§5.2, ADR-058) — invalidates the
 * sweep-status query key on success so the screen re-reads the fresh
 * last-run-at/count immediately. */
export function useTriggerSweepMutation() {
  const queryClient = useQueryClient();
  return useMutation<TriggerSweepResponse, unknown, void>({
    mutationFn: () => adminApi.triggerScoringSweep(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SWEEP_STATUS_QUERY_KEY });
    },
  });
}
