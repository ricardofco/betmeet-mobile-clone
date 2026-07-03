import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { poolsApi, type PoolMemberPredictionsResponse } from '@/platform/backend-api/pools-api';
import {
  predictionsApi,
  type ResetOverrideResponse,
  type SavePredictionInput,
  type SavePredictionResponse,
} from '@/platform/backend-api/predictions-api';

/**
 * POOLS-6 (design.md §1.3/§3/§6) — the pool's member-prediction grid,
 * called directly through `poolsApi`/`predictionsApi` (both platform-seam
 * modules, MF-shared `BackendApiClient` singleton underneath) — no JS-level
 * import of anything from `src/host/predictions/` (ADR-036).
 */
export const poolMemberPredictionsQueryKey = (poolId: string) => ['pools', 'memberPredictions', poolId] as const;

export function usePoolMemberPredictionsQuery(poolId: string) {
  return useQuery<PoolMemberPredictionsResponse>({
    queryKey: poolMemberPredictionsQueryKey(poolId),
    queryFn: () => poolsApi.getMemberPredictions(poolId),
    enabled: poolId.length > 0,
  });
}

function useInvalidatePoolMemberPredictions(poolId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: poolMemberPredictionsQueryKey(poolId) });
}

/** The viewer's own override save, from inside the grid (PREDICTIONS-3). */
export function useSaveGridPredictionMutation(poolId: string) {
  const invalidate = useInvalidatePoolMemberPredictions(poolId);
  const queryClient = useQueryClient();
  return useMutation<SavePredictionResponse, unknown, SavePredictionInput>({
    mutationFn: input => predictionsApi.savePrediction(input),
    onSuccess: response => {
      if (response.ok) {
        invalidate();
        // Also refresh the host's flat "my predictions" list if mounted —
        // same MF-shared-QueryClient mechanism design.md §6 documents for
        // the reverse direction.
        queryClient.invalidateQueries({ queryKey: ['predictions', 'mine'] });
      }
    },
  });
}

/** Reset a pool override back to the global prediction, from inside the
 * grid (PREDICTIONS-4). */
export function useResetGridOverrideMutation(poolId: string) {
  const invalidate = useInvalidatePoolMemberPredictions(poolId);
  const queryClient = useQueryClient();
  return useMutation<ResetOverrideResponse, unknown, { matchId: string; poolId: string }>({
    mutationFn: input => predictionsApi.resetOverride(input),
    onSuccess: response => {
      if (response.ok) {
        invalidate();
        queryClient.invalidateQueries({ queryKey: ['predictions', 'mine'] });
      }
    },
  });
}
