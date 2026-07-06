/**
 * The ONE secondary-sort comparator used by every ranking sort this bolt
 * builds (ADR-049 — ties applied uniformly across global ranking, pool
 * leaderboard, and both live-projection paths, a deliberate mobile-side
 * unification of betmeet-clone's own internal inconsistency — see ADR-049
 * for the full record). `rank-projection.ts`'s `buildRankedView` takes this
 * as its one tie-break parameter; no call site may pass a different one
 * without a new, visible ADR.
 */
export function compareByNicknameAscending(
  a: { nickname: string | null },
  b: { nickname: string | null },
): number {
  const nicknameA = a.nickname ?? '';
  const nicknameB = b.nickname ?? '';
  return nicknameA.localeCompare(nicknameB);
}
