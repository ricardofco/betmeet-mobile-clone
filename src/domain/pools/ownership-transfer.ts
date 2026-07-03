/**
 * POOLS-7 — ownership transfer, advisory client-side mirror (model.md §3).
 * The backend re-derives and re-checks this independently
 * (`pools.transferOwnership`, design.md §3.1) — this module only decides
 * whether to enable the "transfer" affordance / which candidates to list.
 */

export type MemberForTransfer = { userId: string; isOwner: boolean };

/**
 * A valid transfer target is a current member who is not already the
 * owner. `viewerId` isn't actually needed to decide this (the owner
 * shouldn't appear as a candidate at all, since `isOwner` already flags
 * them) but is accepted for call-site clarity/symmetry with other
 * permission predicates in this module family.
 */
export function isValidTransferTarget(
  candidateUserId: string,
  _viewerId: string,
  members: MemberForTransfer[],
): boolean {
  const candidate = members.find(m => m.userId === candidateUserId);
  if (!candidate) return false;
  return !candidate.isOwner;
}

/** Candidates the UI should offer — every member except the current owner.
 * Generic over `T` so callers passing a richer shape (e.g. `PoolMember`,
 * which also carries `nickname`) get that shape back, not the narrowed
 * `MemberForTransfer`. */
export function transferCandidates<T extends MemberForTransfer>(members: T[]): T[] {
  return members.filter(m => !m.isOwner);
}
