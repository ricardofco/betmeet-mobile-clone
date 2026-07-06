import { resolveEffectivePredictions, type EffectivePredictionRow } from '../pool-leaderboard-aggregation';

const POOL_ID = 'pool-1';

function row(overrides: Partial<EffectivePredictionRow> & Pick<EffectivePredictionRow, 'id' | 'userId' | 'matchId' | 'poolId'>): EffectivePredictionRow {
  return {
    homeScore: 1,
    awayScore: 0,
    penaltyWinnerTeamId: null,
    ...overrides,
  };
}

describe('resolveEffectivePredictions (design.md §3, model.md §7)', () => {
  it('prefers the pool-scoped override over the global prediction for the same (user, match) pair', () => {
    const globalRow = row({ id: 'g1', userId: 'u1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 2 });
    const overrideRow = row({ id: 'o1', userId: 'u1', matchId: 'm1', poolId: POOL_ID, homeScore: 3, awayScore: 0 });

    const effective = resolveEffectivePredictions([globalRow, overrideRow], POOL_ID);

    expect(effective.size).toBe(1);
    expect(effective.get('u1::m1')).toEqual(overrideRow);
  });

  it('falls back to the global prediction when no pool-scoped override exists for that pair', () => {
    const globalRow = row({ id: 'g1', userId: 'u1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 1 });

    const effective = resolveEffectivePredictions([globalRow], POOL_ID);

    expect(effective.size).toBe(1);
    expect(effective.get('u1::m1')).toEqual(globalRow);
  });

  it('never double-counts: a (user, match) pair with BOTH an override and a global row still contributes exactly ONE effective row', () => {
    const globalRow = row({ id: 'g1', userId: 'u1', matchId: 'm1', poolId: null });
    const overrideRow = row({ id: 'o1', userId: 'u1', matchId: 'm1', poolId: POOL_ID });
    // A second, unrelated member's rows for the same match — proves the
    // dedup is scoped per (user, match), not globally collapsing everything
    // into one row.
    const otherUserGlobal = row({ id: 'g2', userId: 'u2', matchId: 'm1', poolId: null });

    const effective = resolveEffectivePredictions([globalRow, overrideRow, otherUserGlobal], POOL_ID);

    expect(effective.size).toBe(2); // one row per user, never per (user, source)
    expect(effective.get('u1::m1')?.id).toBe('o1'); // override wins
    expect(effective.get('u2::m1')?.id).toBe('g2');
  });

  it('ignores a DIFFERENT pool\'s override row entirely — it is neither the requested pool\'s override nor a global row', () => {
    const otherPoolOverride = row({ id: 'o-other', userId: 'u1', matchId: 'm1', poolId: 'pool-2' });

    const effective = resolveEffectivePredictions([otherPoolOverride], POOL_ID);

    expect(effective.size).toBe(0);
  });

  it('omits a (user, match) pair entirely when the user never predicted that match (neither override nor global) — contributes 0, not an error', () => {
    // Only a row for a DIFFERENT match exists for this user.
    const unrelated = row({ id: 'g1', userId: 'u1', matchId: 'm2', poolId: null });

    const effective = resolveEffectivePredictions([unrelated], POOL_ID);

    expect(effective.has('u1::m1')).toBe(false);
    expect(effective.size).toBe(1); // only m2 is present
  });

  it('handles multiple members across multiple matches independently', () => {
    const rows = [
      row({ id: 'g1', userId: 'u1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 0 }),
      row({ id: 'o1', userId: 'u1', matchId: 'm2', poolId: POOL_ID, homeScore: 0, awayScore: 0 }),
      row({ id: 'g2', userId: 'u2', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 2 }),
      row({ id: 'o2', userId: 'u2', matchId: 'm1', poolId: POOL_ID, homeScore: 3, awayScore: 3 }),
    ];

    const effective = resolveEffectivePredictions(rows, POOL_ID);

    expect(effective.size).toBe(3); // u1::m1, u1::m2, u2::m1
    expect(effective.get('u1::m1')?.id).toBe('g1'); // u1 has no override for m1
    expect(effective.get('u1::m2')?.id).toBe('o1');
    expect(effective.get('u2::m1')?.id).toBe('o2'); // u2's override wins over its global for m1
  });
});
