import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi, type DeleteAccountResponse, type OwnershipAssignmentInput } from '@/platform/backend-api/auth-api';
import { poolsApi, type OwnedPoolTransferDTO } from '@/platform/backend-api/pools-api';

/**
 * AUTH-6 (design.md §6) — the delete-account confirm modal's data. Only
 * fetched while the delete-account screen is mounted (`enabled` gate on
 * the caller side, same pattern `usePoolDetailQuery` already uses).
 */
export const OWNED_POOLS_FOR_DELETION_QUERY_KEY = ['pools', 'ownedForDeletion'] as const;

export function useOwnedPoolsForDeletionQuery(enabled: boolean) {
  return useQuery<OwnedPoolTransferDTO[]>({
    queryKey: OWNED_POOLS_FOR_DELETION_QUERY_KEY,
    queryFn: () => poolsApi.getOwnedPoolsForDeletion(),
    enabled,
  });
}

export function useDeleteAccountMutation() {
  return useMutation<DeleteAccountResponse, unknown, OwnershipAssignmentInput[]>({
    mutationFn: poolOwnershipAssignments => authApi.deleteAccount({ poolOwnershipAssignments }),
  });
}
