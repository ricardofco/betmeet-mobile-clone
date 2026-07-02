/**
 * POOLS-2/POOLS-4 — membership action rules (model.md §6). All pure
 * predicates over `(pool, userId)`, all **advisory** — the backend
 * re-checks ownership/membership with its own DB read regardless of what
 * the client believes (design.md §2.1).
 *
 * @invariant None of these functions accept a competition/match/kickoff
 * input, and none ever will without a new ADR explicitly superseding
 * ADR-033. "Joining, leaving, kicking, and deleting a league are allowed
 * at any time — including after the competition has started" — an earlier
 * 'freeze' rule was explicitly removed (domain-overview.md §5.3) and must
 * not be reintroduced by pattern-matching against predictions' kickoff
 * lock (a different, still-valid gate on a different resource). See
 * ADR-033 for the full record.
 */

export type PoolForMembershipPermission = {
  ownerId: string;
  type: 'PUBLIC' | 'PRIVATE';
};

export function isOwner(pool: PoolForMembershipPermission, userId: string): boolean {
  return pool.ownerId === userId;
}

/** A member (not the owner) may leave — the owner must delete or transfer (transfer is Bolt 8/POOLS-7). */
export function canLeave(pool: PoolForMembershipPermission, userId: string): boolean {
  return !isOwner(pool, userId);
}

/** Only the owner may kick, and never themself. */
export function canKick(pool: PoolForMembershipPermission, viewerId: string, targetUserId: string): boolean {
  return isOwner(pool, viewerId) && targetUserId !== pool.ownerId;
}

export function canDelete(pool: PoolForMembershipPermission, userId: string): boolean {
  return isOwner(pool, userId);
}

export function canRename(pool: PoolForMembershipPermission, userId: string): boolean {
  return isOwner(pool, userId);
}

export function canUpdateVisibility(pool: PoolForMembershipPermission, userId: string): boolean {
  return isOwner(pool, userId);
}

/** The toggle is meaningless for PUBLIC pools (any member can always invite there — no toggle to read). */
export function canUpdateMembersCanInvite(pool: PoolForMembershipPermission, userId: string): boolean {
  return isOwner(pool, userId) && pool.type === 'PRIVATE';
}
