/**
 * The dense-ranking algorithm (model.md §5, ported from betmeet-clone's
 * `src/features/scoring-rankings/services/ranking.ts`) — "1, 1, 2", never
 * "1, 1, 3": tied entries share one `position`; the next distinct-points
 * group's position is exactly `previousPosition + 1`, regardless of how many
 * users tied. This is the ONE physical implementation reused identically by
 * global ranking, pool leaderboard, and both live-projection paths
 * (RANKINGS-1/2/3) — same "one physical implementation" discipline as
 * ADR-015/ADR-017/ADR-025.
 *
 * Generic over any row shape via `getPoints`/`tieBreak` — the ranking
 * surface's own row type never needs to satisfy a shared numeric-field
 * interface beyond what the caller already has in hand.
 */

export type TieBreakComparator<T> = (a: T, b: T) => number;

export function assignDensePositions<T>(
  rows: readonly T[],
  getPoints: (row: T) => number,
  tieBreak: TieBreakComparator<T>,
): (T & { position: number; isTied: boolean })[] {
  const sorted = [...rows].sort((a, b) => {
    const diff = getPoints(b) - getPoints(a);
    if (diff !== 0) return diff;
    return tieBreak(a, b);
  });

  const countByPoints = new Map<number, number>();
  for (const row of sorted) {
    const points = getPoints(row);
    countByPoints.set(points, (countByPoints.get(points) ?? 0) + 1);
  }

  let position = 0;
  let previousPoints: number | null = null;

  return sorted.map(row => {
    const points = getPoints(row);
    if (previousPoints === null || points !== previousPoints) {
      position += 1;
    }
    previousPoints = points;
    return {
      ...row,
      position,
      isTied: (countByPoints.get(points) ?? 0) > 1,
    };
  });
}
