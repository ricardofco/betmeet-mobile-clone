import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';
import type { Pool, PoolMember, PoolMembership, PoolSummary, PoolVisibility } from '@/domain/pools';

/**
 * Typed wrappers around `BackendApiClient.request()` for the `pools.*`
 * capability group (design.md §2/§7, ADR-030/ADR-032). Mirrors
 * `competition-api.ts`/`predictions-api.ts`/`profile-api.ts`'s exact
 * pattern — same shared `getBackendApiClient()` singleton, no new
 * transport. Reachable from the `pools` remote exactly like
 * `predictions-api.ts` is reachable from the host — both go through the
 * one `getBackendApiClient()` instance, itself an MF shared singleton
 * (system-context.md §4).
 *
 * Response shapes are discriminated unions matching design.md §2's table
 * (`{ok:true,...} | {ok:false,error:...}`), mirroring
 * `predictions-api.ts`'s `SavePredictionResponse` shape — no new
 * response-envelope convention introduced.
 */

export type CreatePoolInput = {
  name: string;
  type: PoolVisibility;
  capacity: number;
  membersCanInvite?: boolean;
};

export type CreatePoolResponse =
  | { ok: true; pool: Pool }
  | { ok: false; error: 'VALIDATION_FAILED' | 'NAME_TAKEN' };

export type RenamePoolResponse =
  | { ok: true; name: string }
  | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' | 'VALIDATION_FAILED' | 'NAME_TAKEN' };

export type DeletePoolResponse = { ok: true } | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' };

export type UpdateVisibilityResponse =
  | { ok: true; type: PoolVisibility }
  | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' | 'NAME_TAKEN' };

export type UpdateMembersCanInviteResponse =
  | { ok: true; membersCanInvite: boolean }
  | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' | 'NOT_APPLICABLE' };

export type JoinResponse =
  | { ok: true; poolId: string; alreadyMember: boolean }
  | { ok: false; error: 'NOT_FOUND' | 'FULL' | 'NOT_PUBLIC' };

export type LeaveResponse = { ok: true } | { ok: false; error: 'NOT_FOUND' | 'NOT_MEMBER' | 'OWNER_CANNOT_LEAVE' };

export type KickResponse = { ok: true } | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' | 'CANNOT_KICK_OWNER' };

export type SetArchivedResponse = { ok: true; archived: boolean } | { ok: false; error: 'NOT_MEMBER' };

export type PoolDetailResponse =
  | { ok: true; pool: Pool; members: PoolMember[]; viewerMembership: PoolMembership | null }
  | { ok: false; error: 'NOT_FOUND' };

export const poolsApi = {
  async createPool(input: CreatePoolInput): Promise<CreatePoolResponse> {
    return getBackendApiClient().request<CreatePoolResponse, CreatePoolInput>({
      capability: 'pools.create',
      body: input,
    });
  },

  async renamePool(input: { poolId: string; name: string }): Promise<RenamePoolResponse> {
    return getBackendApiClient().request<RenamePoolResponse, typeof input>({
      capability: 'pools.rename',
      body: input,
    });
  },

  async deletePool(poolId: string): Promise<DeletePoolResponse> {
    return getBackendApiClient().request<DeletePoolResponse, { poolId: string }>({
      capability: 'pools.delete',
      body: { poolId },
    });
  },

  async updateVisibility(input: { poolId: string; type: PoolVisibility }): Promise<UpdateVisibilityResponse> {
    return getBackendApiClient().request<UpdateVisibilityResponse, typeof input>({
      capability: 'pools.updateVisibility',
      body: input,
    });
  },

  async updateMembersCanInvite(input: {
    poolId: string;
    membersCanInvite: boolean;
  }): Promise<UpdateMembersCanInviteResponse> {
    return getBackendApiClient().request<UpdateMembersCanInviteResponse, typeof input>({
      capability: 'pools.updateMembersCanInvite',
      body: input,
    });
  },

  async joinByToken(token: string): Promise<JoinResponse> {
    return getBackendApiClient().request<JoinResponse, { token: string }>({
      capability: 'pools.joinByToken',
      body: { token },
    });
  },

  async joinPublic(poolId: string): Promise<JoinResponse> {
    return getBackendApiClient().request<JoinResponse, { poolId: string }>({
      capability: 'pools.joinPublic',
      body: { poolId },
    });
  },

  async leavePool(poolId: string): Promise<LeaveResponse> {
    return getBackendApiClient().request<LeaveResponse, { poolId: string }>({
      capability: 'pools.leave',
      body: { poolId },
    });
  },

  async kickMember(input: { poolId: string; targetUserId: string }): Promise<KickResponse> {
    return getBackendApiClient().request<KickResponse, typeof input>({
      capability: 'pools.kickMember',
      body: input,
    });
  },

  async setArchived(input: { poolId: string; archived: boolean }): Promise<SetArchivedResponse> {
    return getBackendApiClient().request<SetArchivedResponse, typeof input>({
      capability: 'pools.setArchived',
      body: input,
    });
  },

  async getMine(): Promise<PoolSummary[]> {
    return getBackendApiClient().request<PoolSummary[]>({
      capability: 'pools.getMine',
    });
  },

  async listPublic(): Promise<Pool[]> {
    return getBackendApiClient().request<Pool[]>({
      capability: 'pools.listPublic',
    });
  },

  async getDetail(poolId: string): Promise<PoolDetailResponse> {
    return getBackendApiClient().request<PoolDetailResponse, { poolId: string }>({
      capability: 'pools.getDetail',
      body: { poolId },
    });
  },
};
