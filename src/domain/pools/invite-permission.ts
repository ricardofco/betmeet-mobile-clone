/**
 * POOLS-2 — invite permission (model.md §5, domain-overview.md §5.3):
 * "the owner can always invite. In a public league, any member can invite
 * (no toggle). In a private league, members can invite only if the owner
 * has enabled `membersCanInvite`."
 *
 * Gates whether the UI shows the "invite"/"share token" affordance at all
 * — advisory UI gating only. This bolt has no directed-invite *write*
 * capability (POOLS-3 is Bolt 8), so there is no backend permission check
 * to mirror here yet; every current member can already see the pool's
 * invite token by virtue of being a member (design.md §5's
 * `invite-token-panel.tsx`).
 */

export type PoolForInvitePermission = {
  type: 'PUBLIC' | 'PRIVATE';
  membersCanInvite: boolean;
};

export function canInvite(pool: PoolForInvitePermission, viewerIsOwner: boolean): boolean {
  if (viewerIsOwner) return true;
  if (pool.type === 'PUBLIC') return true;
  return pool.membersCanInvite;
}
