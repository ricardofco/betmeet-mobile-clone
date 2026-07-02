export type { PoolVisibility, Pool, PoolMembership, PoolMember, PoolSummary } from '@/domain/pools/pool';

export { MIN_POOL_CAPACITY, MAX_POOL_CAPACITY, validatePoolCapacity, hasCapacityFor } from '@/domain/pools/pool-capacity';

export { MIN_POOL_NAME_LENGTH, MAX_POOL_NAME_LENGTH, validatePoolName, normalizePoolName } from '@/domain/pools/pool-name';

export {
  INVITE_TOKEN_ALPHABET,
  MIN_INVITE_TOKEN_LENGTH,
  MAX_INVITE_TOKEN_LENGTH,
  normalizeInviteToken,
  isPlausibleInviteToken,
} from '@/domain/pools/invite-token';

export type { PoolForInvitePermission } from '@/domain/pools/invite-permission';
export { canInvite } from '@/domain/pools/invite-permission';

export type { PoolForMembershipPermission } from '@/domain/pools/pool-membership-permissions';
export {
  isOwner,
  canLeave,
  canKick,
  canDelete,
  canRename,
  canUpdateVisibility,
  canUpdateMembersCanInvite,
} from '@/domain/pools/pool-membership-permissions';

export { isVisibilityChangeNoOp, requiresNameUniquenessCheck } from '@/domain/pools/pool-visibility';
