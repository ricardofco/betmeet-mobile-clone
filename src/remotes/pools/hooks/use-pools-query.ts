import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  poolsApi,
  type CreateDirectedInviteResponse,
  type CreatePoolInput,
  type CreatePoolResponse,
  type DeletePoolResponse,
  type JoinResponse,
  type KickResponse,
  type LeaveResponse,
  type PoolDetailResponse,
  type RenamePoolResponse,
  type SetArchivedResponse,
  type TransferOwnershipResponse,
  type UpdateMembersCanInviteResponse,
  type UpdateVisibilityResponse,
} from '@/platform/backend-api/pools-api';
import type { Pool, PoolSummary, PoolVisibility } from '@/domain/pools';

/**
 * State boundaries (design.md §6). `usePoolDetailQuery` is the one
 * parameterized key in this bolt — detail is inherently per-pool, unlike
 * predictions' Bolt 6 flat-key precedent which had exactly one "mine"
 * collection to key (ADR-019's flat-key discipline still applies wherever
 * there is only one logical collection; it doesn't forbid a parameterized
 * key when the resource itself is naturally per-id).
 */
export const MY_POOLS_QUERY_KEY = ['pools', 'mine'] as const;
export const PUBLIC_POOLS_QUERY_KEY = ['pools', 'public'] as const;
export const poolDetailQueryKey = (poolId: string) => ['pools', 'detail', poolId] as const;

export function useMyPoolsQuery() {
  return useQuery<PoolSummary[]>({
    queryKey: MY_POOLS_QUERY_KEY,
    queryFn: () => poolsApi.getMine(),
  });
}

export function usePublicPoolsQuery() {
  return useQuery<Pool[]>({
    queryKey: PUBLIC_POOLS_QUERY_KEY,
    queryFn: () => poolsApi.listPublic(),
  });
}

export function usePoolDetailQuery(poolId: string) {
  return useQuery<PoolDetailResponse>({
    queryKey: poolDetailQueryKey(poolId),
    queryFn: () => poolsApi.getDetail(poolId),
    enabled: poolId.length > 0,
  });
}

function useInvalidatePools() {
  const queryClient = useQueryClient();
  return {
    invalidateMine: () => queryClient.invalidateQueries({ queryKey: MY_POOLS_QUERY_KEY }),
    invalidatePublic: () => queryClient.invalidateQueries({ queryKey: PUBLIC_POOLS_QUERY_KEY }),
    invalidateDetail: (poolId: string) => queryClient.invalidateQueries({ queryKey: poolDetailQueryKey(poolId) }),
  };
}

export function useCreatePoolMutation() {
  const { invalidateMine, invalidatePublic } = useInvalidatePools();
  return useMutation<CreatePoolResponse, unknown, CreatePoolInput>({
    mutationFn: input => poolsApi.createPool(input),
    onSuccess: response => {
      if (response.ok) {
        invalidateMine();
        if (response.pool.type === 'PUBLIC') invalidatePublic();
      }
    },
  });
}

export function useRenamePoolMutation() {
  const { invalidateMine, invalidateDetail } = useInvalidatePools();
  return useMutation<RenamePoolResponse, unknown, { poolId: string; name: string }>({
    mutationFn: input => poolsApi.renamePool(input),
    onSuccess: (response, variables) => {
      if (response.ok) {
        invalidateMine();
        invalidateDetail(variables.poolId);
      }
    },
  });
}

export function useDeletePoolMutation() {
  const { invalidateMine, invalidatePublic } = useInvalidatePools();
  return useMutation<DeletePoolResponse, unknown, string>({
    mutationFn: poolId => poolsApi.deletePool(poolId),
    onSuccess: response => {
      if (response.ok) {
        invalidateMine();
        invalidatePublic();
      }
    },
  });
}

export function useUpdateVisibilityMutation() {
  const { invalidateMine, invalidatePublic, invalidateDetail } = useInvalidatePools();
  return useMutation<UpdateVisibilityResponse, unknown, { poolId: string; type: PoolVisibility }>({
    mutationFn: input => poolsApi.updateVisibility(input),
    onSuccess: (response, variables) => {
      if (response.ok) {
        invalidateMine();
        invalidatePublic();
        invalidateDetail(variables.poolId);
      }
    },
  });
}

export function useUpdateMembersCanInviteMutation() {
  const { invalidateDetail } = useInvalidatePools();
  return useMutation<UpdateMembersCanInviteResponse, unknown, { poolId: string; membersCanInvite: boolean }>({
    mutationFn: input => poolsApi.updateMembersCanInvite(input),
    onSuccess: (response, variables) => {
      if (response.ok) invalidateDetail(variables.poolId);
    },
  });
}

export function useJoinByTokenMutation() {
  const { invalidateMine } = useInvalidatePools();
  return useMutation<JoinResponse, unknown, string>({
    mutationFn: token => poolsApi.joinByToken(token),
    onSuccess: response => {
      if (response.ok) invalidateMine();
    },
  });
}

export function useJoinPublicMutation() {
  const { invalidateMine } = useInvalidatePools();
  return useMutation<JoinResponse, unknown, string>({
    mutationFn: poolId => poolsApi.joinPublic(poolId),
    onSuccess: response => {
      if (response.ok) invalidateMine();
    },
  });
}

export function useLeavePoolMutation() {
  const { invalidateMine, invalidateDetail } = useInvalidatePools();
  return useMutation<LeaveResponse, unknown, string>({
    mutationFn: poolId => poolsApi.leavePool(poolId),
    onSuccess: (response, poolId) => {
      if (response.ok) {
        invalidateMine();
        invalidateDetail(poolId);
      }
    },
  });
}

export function useKickMemberMutation() {
  const { invalidateDetail } = useInvalidatePools();
  return useMutation<KickResponse, unknown, { poolId: string; targetUserId: string }>({
    mutationFn: input => poolsApi.kickMember(input),
    onSuccess: (response, variables) => {
      if (response.ok) invalidateDetail(variables.poolId);
    },
  });
}

export function useSetArchivedMutation() {
  const { invalidateMine } = useInvalidatePools();
  return useMutation<SetArchivedResponse, unknown, { poolId: string; archived: boolean }>({
    mutationFn: input => poolsApi.setArchived(input),
    onSuccess: response => {
      if (response.ok) invalidateMine();
    },
  });
}

/** POOLS-3 (design.md §3/§8). No query is invalidated on success — this
 * bolt's scope has no client-visible "pending invites" list (model.md §2). */
export function useCreateDirectedInviteMutation() {
  return useMutation<CreateDirectedInviteResponse, unknown, { poolId: string; target: string }>({
    mutationFn: input => poolsApi.createDirectedInvite(input),
  });
}

/** POOLS-7 (design.md §3/§8/ADR-040) — the standalone, voluntary transfer. */
export function useTransferOwnershipMutation() {
  const { invalidateMine, invalidateDetail } = useInvalidatePools();
  return useMutation<TransferOwnershipResponse, unknown, { poolId: string; newOwnerId: string }>({
    mutationFn: input => poolsApi.transferOwnership(input),
    onSuccess: (response, variables) => {
      if (response.ok) {
        invalidateMine();
        invalidateDetail(variables.poolId);
      }
    },
  });
}
