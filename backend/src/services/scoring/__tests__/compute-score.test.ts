import { computeScore, derivePenaltyWinner } from '../compute-score';

describe('computeScore (backend twin of src/shared/scoring/compute-score.ts, ADR-051)', () => {
  it('awards EXACT_SCORE for an exact match, independent of result/goal components', () => {
    const result = computeScore({
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 2,
      actualAway: 1,
      isKnockout: false,
    });
    expect(result).toMatchObject({ matchedCase: 'EXACT', basePoints: 5, totalPoints: 5 });
  });

  it('awards CORRECT_RESULT plus any matching goal counts for a non-exact correct result', () => {
    // Predicted 2-0 (home win), actual 3-0 (home win) — result matches, home
    // goal count matches, away doesn't.
    const result = computeScore({
      predictedHome: 2,
      predictedAway: 0,
      actualHome: 3,
      actualAway: 0,
      isKnockout: false,
    });
    expect(result.matchedCase).toBe('RESULT');
    expect(result.totalPoints).toBe(3); // 2 (result) + 1 (home goals)
  });

  it('awards PARTIAL_GOAL_COUNT only when the result itself is wrong but a goal count matches', () => {
    // Predicted 1-2 (away win), actual 1-1 (draw) — result wrong, home goals match.
    const result = computeScore({
      predictedHome: 1,
      predictedAway: 2,
      actualHome: 1,
      actualAway: 1,
      isKnockout: false,
    });
    expect(result.matchedCase).toBe('PARTIAL');
    expect(result.totalPoints).toBe(1);
  });

  it('awards MISS (0 points) when nothing matches', () => {
    const result = computeScore({
      predictedHome: 0,
      predictedAway: 0,
      actualHome: 3,
      actualAway: 1,
      isKnockout: false,
    });
    expect(result.matchedCase).toBe('MISS');
    expect(result.totalPoints).toBe(0);
  });

  it('applies the penalty bonus only for a tied knockout match with a matching predicted/actual penalty winner', () => {
    const result = computeScore({
      predictedHome: 1,
      predictedAway: 1,
      actualHome: 1,
      actualAway: 1,
      isKnockout: true,
      predictedPenaltyWinner: 'home',
      actualPenaltyWinner: 'home',
    });
    expect(result.penaltyApplied).toBe(true);
    expect(result.penaltyPoints).toBe(1);
    expect(result.totalPoints).toBe(5 + 1); // exact score (tied 1-1) + penalty bonus
  });

  it('never applies the penalty bonus for a non-knockout tied match, even with a matching guess', () => {
    const result = computeScore({
      predictedHome: 1,
      predictedAway: 1,
      actualHome: 1,
      actualAway: 1,
      isKnockout: false,
      predictedPenaltyWinner: 'home',
      actualPenaltyWinner: 'home',
    });
    expect(result.penaltyApplied).toBe(false);
    expect(result.penaltyPoints).toBe(0);
  });

  // -------------------------------------------------------------------------
  // THE single most important regression test in this whole bolt
  // (design.md §11 / model.md §4 point 5 / ADR-051): two users predicting the
  // same LIVE knockout match, same live scoreline, different
  // `penaltyWinnerTeamId` picks — both must land on IDENTICAL `totalPoints`
  // with NO penalty bonus to either, because `actualPenaltyWinner` MUST be
  // passed as `null` unconditionally for any LIVE match (there is no
  // shootout data yet). This is exactly what
  // `rankings.getGlobalRanking`/`getPoolLeaderboard`'s live-projection branch
  // does (`handlers.ts`, always passing `actualPenaltyWinner: null` for a
  // LIVE match) — this test proves the underlying `computeScore` behavior
  // that guarantee depends on.
  // -------------------------------------------------------------------------
  it('TIED-LIVE-MATCH REGRESSION: two users with different predicted penalty winners get identical totalPoints and no bonus when actualPenaltyWinner is null (LIVE match)', () => {
    const sharedLiveScoreline = {
      predictedHome: 1,
      predictedAway: 1,
      actualHome: 1,
      actualAway: 1,
      isKnockout: true,
      actualPenaltyWinner: null, // MUST be null for any LIVE match
    };

    const userAPredictsHomePenaltyWinner = computeScore({
      ...sharedLiveScoreline,
      predictedPenaltyWinner: 'home',
    });
    const userBPredictsAwayPenaltyWinner = computeScore({
      ...sharedLiveScoreline,
      predictedPenaltyWinner: 'away',
    });

    // Neither gets a bonus...
    expect(userAPredictsHomePenaltyWinner.penaltyApplied).toBe(false);
    expect(userBPredictsAwayPenaltyWinner.penaltyApplied).toBe(false);
    expect(userAPredictsHomePenaltyWinner.penaltyPoints).toBe(0);
    expect(userBPredictsAwayPenaltyWinner.penaltyPoints).toBe(0);

    // ...and both land on the exact same total (the exact-score component only).
    expect(userAPredictsHomePenaltyWinner.totalPoints).toBe(userBPredictsAwayPenaltyWinner.totalPoints);
    expect(userAPredictsHomePenaltyWinner.totalPoints).toBe(5);

    // Also true for a user who predicted no penalty winner at all.
    const userCPredictsNoPenaltyWinner = computeScore({ ...sharedLiveScoreline, predictedPenaltyWinner: null });
    expect(userCPredictsNoPenaltyWinner.totalPoints).toBe(5);
    expect(userCPredictsNoPenaltyWinner.penaltyApplied).toBe(false);
  });
});

describe('derivePenaltyWinner', () => {
  it('returns "home" when the home side scores more penalties', () => {
    expect(derivePenaltyWinner(5, 4)).toBe('home');
  });

  it('returns "away" when the away side scores more penalties', () => {
    expect(derivePenaltyWinner(3, 4)).toBe('away');
  });

  it('returns null for a tied (invalid) shootout score', () => {
    expect(derivePenaltyWinner(4, 4)).toBeNull();
  });
});
