/**
 * Server-side, authoritative pools permission checks (design.md §2.1) —
 * independently authored (Prisma models, not imported), same rules as
 * mobile's src/domain/pools/pool-membership-permissions.ts, but this is the
 * actual gate: the backend re-checks ownership/membership with its own DB
 * read regardless of what the client believes.
 *
 * @invariant None of these functions accept a competition/match/kickoff
 * input — see ADR-033. Joining, leaving, kicking, and deleting a pool are
 * allowed at any time; do not reintroduce a "tournament freeze" gate here.
 */

export type PoolForPermission = {
  ownerId: string;
  type: 'PUBLIC' | 'PRIVATE';
  membersCanInvite?: boolean;
};

export function isOwner(pool: PoolForPermission, userId: string): boolean {
  return pool.ownerId === userId;
}

export function canLeave(pool: PoolForPermission, userId: string): boolean {
  return !isOwner(pool, userId);
}

export function canKick(pool: PoolForPermission, viewerId: string, targetUserId: string): boolean {
  return isOwner(pool, viewerId) && targetUserId !== pool.ownerId;
}

/**
 * Bolt 8 (POOLS-3, design.md §3.1) — the real, authoritative twin of
 * mobile's advisory `src/domain/pools/invite-permission.ts#canInvite`.
 * Owner always allowed; PUBLIC-pool member always allowed (no toggle);
 * PRIVATE-pool non-owner member allowed only if `membersCanInvite`.
 */
export function canInvite(pool: PoolForPermission, userId: string): boolean {
  if (isOwner(pool, userId)) return true;
  if (pool.type === 'PUBLIC') return true;
  return pool.membersCanInvite === true;
}

/**
 * Bolt 8 (POOLS-7, design.md §3.1) — a valid ownership-transfer target is
 * a current member who is not already the owner.
 */
export function isValidTransferTarget(newOwnerId: string, memberUserIds: string[], ownerId: string): boolean {
  if (newOwnerId === ownerId) return false;
  return memberUserIds.includes(newOwnerId);
}
