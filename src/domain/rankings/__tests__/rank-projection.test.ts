import { buildRankedView } from '@/domain/rankings/rank-projection';
import type { RankingRow } from '@/domain/rankings/ranking-row';

function makeRow(overrides: Partial<RankingRow> & Pick<RankingRow, 'userId'>): RankingRow {
  return {
    nickname: overrides.userId,
    avatarUrl: null,
    isViewer: false,
    confirmedTotal: 0,
    projectedTotal: null,
    hasConfirmedEntry: true,
    ...overrides,
  };
}

describe('buildRankedView (design.md §2/§7 — the one shared read-time projection)', () => {
  it('confirmed-only: when no row carries a non-null projectedTotal, projected is null and confirmed is dense-ranked by confirmedTotal', () => {
    const rows: RankingRow[] = [
      makeRow({ userId: 'u1', nickname: 'alice', confirmedTotal: 20 }),
      makeRow({ userId: 'u2', nickname: 'bob', confirmedTotal: 10 }),
    ];

    const view = buildRankedView(rows);

    expect(view.projected).toBeNull();
    expect(view.confirmed).toHaveLength(2);
    expect(view.confirmed[0].userId).toBe('u1');
    expect(view.confirmed[0].position).toBe(1);
    expect(view.confirmed[1].userId).toBe('u2');
    expect(view.confirmed[1].position).toBe(2);
  });

  it('projected + positionDelta: a live response re-ranks by projectedTotal and carries the confirmed-pass position forward', () => {
    const rows: RankingRow[] = [
      // Confirmed: u2 (30) > u1 (10) -> u2 is #1, u1 is #2.
      // Projected: u1 rockets ahead with live points -> u1 becomes #1, u2 #2.
      makeRow({ userId: 'u1', nickname: 'alice', confirmedTotal: 10, projectedTotal: 40 }),
      makeRow({ userId: 'u2', nickname: 'bob', confirmedTotal: 30, projectedTotal: 30 }),
    ];

    const view = buildRankedView(rows);

    expect(view.projected).not.toBeNull();
    const projected = view.projected!;
    const byId = new Map(projected.map(r => [r.userId, r]));

    expect(byId.get('u1')?.position).toBe(1);
    expect(byId.get('u1')?.previousPosition).toBe(2); // was #2 in the confirmed pass
    expect(byId.get('u1')?.positionDelta).toBe(1); // previousPosition(2) - position(1) = rose by 1

    expect(byId.get('u2')?.position).toBe(2);
    expect(byId.get('u2')?.previousPosition).toBe(1); // was #1 in the confirmed pass
    expect(byId.get('u2')?.positionDelta).toBe(-1); // fell by 1
  });

  // design.md §2 (rank-projection.ts's own doc comment): "previousPosition
  // (`null` for a synthesized row with no confirmed-pass position, model.md
  // §4 point 6) ... regardless of what a naive 0-point tie would otherwise
  // produce". A `hasConfirmedEntry: false` row has confirmedTotal: 0, same
  // as any other zero-scoring member — a naive dense-rank would still give
  // it a real (tied) position in the confirmed pass. The rule is explicit
  // that this must NOT leak into `previousPosition`/`positionDelta` for the
  // projected view; a synthesized row is "new" to the leaderboard, not
  // "tied for last."
  it('previousPosition: null and positionDelta: null for a hasConfirmedEntry: false synthesized row, even though a naive 0-point tie would give it a real confirmed-pass position', () => {
    const rows: RankingRow[] = [
      makeRow({ userId: 'u1', nickname: 'alice', confirmedTotal: 20, projectedTotal: 20, hasConfirmedEntry: true }),
      // Zero confirmedTotal — a naive dense-rank ties this with any other
      // 0-point row — but this user has NEVER had a scored prediction; they
      // only appear because of an in-progress LIVE prediction.
      makeRow({
        userId: 'u2',
        nickname: 'newcomer',
        confirmedTotal: 0,
        projectedTotal: 5,
        hasConfirmedEntry: false,
      }),
    ];

    const view = buildRankedView(rows);
    const projected = view.projected!;
    const synthesizedRow = projected.find(r => r.userId === 'u2')!;

    expect(synthesizedRow.previousPosition).toBeNull();
    expect(synthesizedRow.positionDelta).toBeNull();

    // Sanity: u1 (a real confirmed entrant) still gets a real previousPosition.
    const realRow = projected.find(r => r.userId === 'u1')!;
    expect(realRow.previousPosition).toBe(1);
    expect(realRow.positionDelta).toBe(0);
  });
});
