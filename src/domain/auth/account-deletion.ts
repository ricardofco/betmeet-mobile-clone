/**
 * AUTH-6 — account deletion (model.md §4). Pure helpers over the
 * owned-pools-needing-transfer shape the `pools.getOwnedPoolsForDeletion`
 * capability returns. The backend independently re-derives and re-checks
 * `allOwnersAssigned`'s condition itself (design.md §3.1) — this module's
 * job is only to drive the confirm-modal's UI (which pools need a picker,
 * whether the submit button should be enabled).
 */

export type OwnedPoolTransfer = {
  poolId: string;
  poolName: string;
  candidates: { userId: string; nickname: string | null }[];
};

export type OwnershipAssignment = { poolId: string; newOwnerId: string };

export const DELETE_ACCOUNT_CONFIRM_PHRASE = 'delete my account';

export function poolsNeedingAssignment(owned: OwnedPoolTransfer[]): OwnedPoolTransfer[] {
  return owned.filter(p => p.candidates.length > 0);
}

export function poolsToBeDeleted(owned: OwnedPoolTransfer[]): OwnedPoolTransfer[] {
  return owned.filter(p => p.candidates.length === 0);
}

export function allOwnersAssigned(owned: OwnedPoolTransfer[], assignments: OwnershipAssignment[]): boolean {
  const assignmentMap = new Map(assignments.map(a => [a.poolId, a.newOwnerId]));
  return poolsNeedingAssignment(owned).every(pool => {
    const newOwnerId = assignmentMap.get(pool.poolId);
    if (!newOwnerId) return false;
    return pool.candidates.some(c => c.userId === newOwnerId);
  });
}

export function isConfirmPhraseValid(typed: string): boolean {
  return typed === DELETE_ACCOUNT_CONFIRM_PHRASE;
}
