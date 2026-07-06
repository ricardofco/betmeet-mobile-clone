import { assignDensePositions } from '@/domain/rankings/dense-ranking';
import { compareByNicknameAscending } from '@/domain/rankings/nickname-tie-break';
import type { ProjectedRow, RankedRow, RankingRow } from '@/domain/rankings/ranking-row';

export type RankedView = {
  confirmed: RankedRow[];
  /** `null` when no row in the response carries a non-null `projectedTotal` (design.md §2). */
  projected: ProjectedRow[] | null;
};

/**
 * The single, shared read-time projection every ranking surface in this bolt
 * calls (design.md §2/§7.2 — "same function reference, not a
 * re-implementation" between the host's global-ranking hook and the `pools`
 * remote's leaderboard hook). Pure: sorts + dense-ranks by `confirmedTotal`
 * for `confirmed`; if the response is live (any row carries a non-null
 * `projectedTotal`), sorts + dense-ranks again by `projectedTotal` for
 * `projected`, carrying each row's confirmed-pass position forward as
 * `previousPosition` and deriving `positionDelta` (model.md §4 points 7/8).
 *
 * Every call site passes `compareByNicknameAscending` as the tie-break
 * (ADR-049 — unified across every ranking surface this bolt builds).
 */
export function buildRankedView(rows: readonly RankingRow[]): RankedView {
  const confirmed = assignDensePositions(rows, row => row.confirmedTotal, compareByNicknameAscending);

  const isLive = rows.some(row => row.projectedTotal !== null);
  if (!isLive) {
    return { confirmed, projected: null };
  }

  const previousPositionByUserId = new Map(confirmed.map(row => [row.userId, row.position]));

  const projected: ProjectedRow[] = assignDensePositions(
    rows,
    row => row.projectedTotal ?? row.confirmedTotal,
    compareByNicknameAscending,
  ).map(row => {
    // A `hasConfirmedEntry: false` row (model.md §4 point 6, a synthesized
    // live-only row) has no real confirmed-pass position — force `null`
    // regardless of what a naive 0-point tie in `previousPositionByUserId`
    // would otherwise produce (design.md §2's explicit rule). Bug found
    // during Bolt 10's Test stage: the map lookup alone can't distinguish
    // "this user really was ranked last, tied at 0" from "this user never
    // had a confirmed entry at all" — both have a real, non-null map entry
    // since `confirmed` is derived from the exact same `rows` array.
    const previousPosition = row.hasConfirmedEntry
      ? (previousPositionByUserId.get(row.userId) ?? null)
      : null;
    return {
      ...row,
      previousPosition,
      positionDelta: previousPosition === null ? null : previousPosition - row.position,
    };
  });

  return { confirmed, projected };
}
