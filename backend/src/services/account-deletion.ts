import { prisma } from '../db';

/**
 * AUTH-6 / POOLS-7 (design.md §3.1/§ADR-039/§ADR-040) — independently
 * authored against domain-overview.md §5.1/§5.3 and Model §4 (cross-checked
 * for the exact transaction shape against betmeet-clone's real
 * src/features/pools/services/account-deletion.ts for reference behavior
 * per the task brief, never imported — requirements.md §7.3).
 *
 * One shared reassign-ownership-and-drop-membership write shape backs both
 * the standalone `pools.transferOwnership` capability (single pool) and
 * `auth.deleteAccount`'s batch transfer-or-delete step (every owned pool at
 * once) — ADR-040: the *rule* ("transferring always drops the old owner's
 * membership row") is defined once here, not duplicated per call site.
 */

export type OwnedPoolTransfer = {
  poolId: string;
  poolName: string;
  candidates: { userId: string; nickname: string | null }[];
};

function formatNickname(base: string | null, discriminator: string | null): string | null {
  if (!base || !discriminator) return null;
  return `${base}#${discriminator}`;
}

/**
 * Pools owned by `userId` and the candidates who could receive ownership
 * (other members, oldest → newest). An empty `candidates` list means that
 * pool will be deleted outright, not transferred.
 */
export async function getOwnedPoolsForDeletion(userId: string): Promise<OwnedPoolTransfer[]> {
  const pools = await prisma.pool.findMany({
    where: { ownerId: userId },
    include: { memberships: { include: { user: true }, orderBy: { joinedAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  return pools.map(pool => ({
    poolId: pool.id,
    poolName: pool.name,
    candidates: pool.memberships
      .filter(m => m.userId !== userId)
      .map(m => ({
        userId: m.userId,
        nickname: formatNickname(m.user.nicknameBase, m.user.nicknameDiscriminator),
      })),
  }));
}

/**
 * Reassigns ownership of a single pool to `newOwnerId` and drops the
 * outgoing owner's membership row, inside one transaction. Caller (the
 * `pools.transferOwnership` handler) is responsible for the
 * isOwner/isValidTransferTarget checks before calling this.
 */
export async function transferSinglePoolOwnership(poolId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
  await prisma.$transaction(async tx => {
    await tx.pool.update({ where: { id: poolId }, data: { ownerId: newOwnerId } });
    await tx.poolMembership.deleteMany({ where: { poolId, userId: currentOwnerId } });
  });
}

export type TransferForDeletionResult = { ok: true } | { ok: false; error: 'MISSING_ASSIGNMENT' };

/**
 * Transfers ownership of every pool `userId` owns (or deletes sole-member
 * pools) and removes the user's remaining memberships, as part of account
 * deletion (ADR-039 — all-or-nothing, one transaction). Re-derives which
 * pools need an assignment itself — never trusts `assignments` (the
 * client-supplied list) to be complete or correct.
 */
export async function transferOwnedPoolsForAccountDeletion(
  userId: string,
  assignments: { poolId: string; newOwnerId: string }[],
): Promise<TransferForDeletionResult> {
  const owned = await getOwnedPoolsForDeletion(userId);
  const assignmentMap = new Map(assignments.map(a => [a.poolId, a.newOwnerId]));

  // Validate every pool needing an assignment has a *valid* one BEFORE
  // opening the transaction — a clean rejection, not a partial write to
  // roll back (ADR-039).
  for (const pool of owned) {
    if (pool.candidates.length === 0) continue;
    const newOwnerId = assignmentMap.get(pool.poolId);
    if (!newOwnerId || !pool.candidates.some(c => c.userId === newOwnerId)) {
      return { ok: false, error: 'MISSING_ASSIGNMENT' };
    }
  }

  await prisma.$transaction(async tx => {
    for (const pool of owned) {
      if (pool.candidates.length === 0) {
        await tx.pool.delete({ where: { id: pool.poolId } });
        continue;
      }
      const newOwnerId = assignmentMap.get(pool.poolId) as string;
      await tx.pool.update({ where: { id: pool.poolId }, data: { ownerId: newOwnerId } });
      await tx.poolMembership.deleteMany({ where: { poolId: pool.poolId, userId } });
    }
    // Remove the user's remaining (non-owner) memberships.
    await tx.poolMembership.deleteMany({ where: { userId } });
  });

  return { ok: true };
}
