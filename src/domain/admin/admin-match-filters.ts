import type { AdminMatchRow } from '@/domain/admin/admin-match-row';

/**
 * Pure array filters over `admin.listMatches`' single `AdminMatchRow[]`
 * fetch (design.md §5.3/§12) — one query, two different pure-function
 * views, same "derive at read time" precedent as `buildRankedView`
 * (ADR-019). Feed `ForceResultScreen`'s and `RevertOverrideScreen`'s match
 * pickers respectively.
 *
 * @invariant (ADR-060's Consequences) These operate ONLY on
 * `admin.listMatches`' own admin-gated shape — they are not, and must not
 * become, a mechanism for deriving admin-only visibility from
 * `competition.getFixture`'s public data client-side.
 */

/** ADMIN-4's match picker — cannot force a result onto an unresolved
 * knockout placeholder (BR-7.4). */
export function matchesEligibleForForceResult(rows: readonly AdminMatchRow[]): AdminMatchRow[] {
  return rows.filter(row => row.bothTeamsResolved);
}

/** ADMIN-5's match picker — only matches with an active manual override can
 * be reverted (there is nothing to revert otherwise). */
export function matchesWithActiveOverride(rows: readonly AdminMatchRow[]): AdminMatchRow[] {
  return rows.filter(row => row.manualOverride === true);
}
