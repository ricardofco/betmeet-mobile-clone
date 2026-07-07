import { useQuery } from '@tanstack/react-query';
import { adminApi, type SweepStatusResponse } from '@/platform/backend-api/admin-api';

/** ADMIN-2/3 merged read (design.md §1.2/§5.2, ADR-058). */
export const SWEEP_STATUS_QUERY_KEY = ['admin', 'sweepStatus'] as const;

export function useSweepStatusQuery() {
  return useQuery<SweepStatusResponse>({
    queryKey: SWEEP_STATUS_QUERY_KEY,
    queryFn: () => adminApi.getScoringSweepStatus(),
  });
}
