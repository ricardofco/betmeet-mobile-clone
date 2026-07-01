import { canShowScoreBreakdown, buildScoreBreakdown } from '@/domain/predictions/prediction-score-display';
import type { Match } from '@/domain/competition';
import type { MyPrediction } from '@/domain/predictions/prediction-with-match';

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    phaseId: 'group-a',
    kickoffAt: '2026-06-15T18:00:00Z',
    status: 'FINISHED',
    homeTeam: null,
    awayTeam: null,
    homeScore: 2,
    awayScore: 1,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

function makePrediction(overrides: Partial<MyPrediction> = {}): MyPrediction {
  return {
    id: 'p1',
    matchId: 'm1',
    poolId: null,
    homeScore: 2,
    awayScore: 1,
    penaltyWinner: null,
    ...overrides,
  };
}

describe('canShowScoreBreakdown (model.md §4, PREDICTIONS-5)', () => {
  it('is true when FINISHED with both scores set', () => {
    expect(canShowScoreBreakdown(makeMatch())).toBe(true);
  });

  it.each(['SCHEDULED', 'LIVE', 'POSTPONED', 'CANCELLED', 'LOCKED'] as const)(
    'is false for status %s',
    status => {
      expect(canShowScoreBreakdown(makeMatch({ status, homeScore: null, awayScore: null }))).toBe(false);
    },
  );

  it('is false when FINISHED but scores are somehow still null (defensive)', () => {
    expect(canShowScoreBreakdown(makeMatch({ homeScore: null, awayScore: null }))).toBe(false);
  });
});

describe('buildScoreBreakdown', () => {
  it('returns null when the match is not finished', () => {
    const match = makeMatch({ status: 'SCHEDULED', homeScore: null, awayScore: null });
    const prediction = makePrediction();
    expect(buildScoreBreakdown({ match, prediction, isKnockout: false })).toBeNull();
  });

  it('delegates to computeScore and returns EXACT for an exact prediction', () => {
    const match = makeMatch({ homeScore: 2, awayScore: 1 });
    const prediction = makePrediction({ homeScore: 2, awayScore: 1 });
    const breakdown = buildScoreBreakdown({ match, prediction, isKnockout: false });
    expect(breakdown).toEqual({
      matchedCase: 'EXACT',
      basePoints: 5,
      penaltyApplied: false,
      penaltyPoints: 0,
      totalPoints: 5,
      explanationKey: 'EXACT',
    });
  });

  it('derives the actual penalty winner from the shootout score and applies the bonus', () => {
    const match = makeMatch({
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 4,
      awayPenaltyScore: 2,
    });
    const prediction = makePrediction({ homeScore: 1, awayScore: 1, penaltyWinner: 'home' });
    const breakdown = buildScoreBreakdown({ match, prediction, isKnockout: true });
    expect(breakdown?.penaltyApplied).toBe(true);
    expect(breakdown?.penaltyPoints).toBe(1);
  });

  it('does not apply the penalty bonus when the predicted winner is wrong', () => {
    const match = makeMatch({
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 2,
      awayPenaltyScore: 4,
    });
    const prediction = makePrediction({ homeScore: 1, awayScore: 1, penaltyWinner: 'home' });
    const breakdown = buildScoreBreakdown({ match, prediction, isKnockout: true });
    expect(breakdown?.penaltyApplied).toBe(false);
    expect(breakdown?.penaltyPoints).toBe(0);
  });

  it('produces a component breakdown for a non-exact, correct-result prediction', () => {
    const match = makeMatch({ homeScore: 3, awayScore: 1 });
    const prediction = makePrediction({ homeScore: 2, awayScore: 0 });
    const breakdown = buildScoreBreakdown({ match, prediction, isKnockout: false });
    expect(breakdown?.matchedCase).toBe('RESULT');
    expect(breakdown?.components).toBeDefined();
  });
});
