import { resolvePointsStatus } from '../resolve-points';

describe('resolvePointsStatus (design.md §4.3, four-state resolution)', () => {
  it('resolves NOT_SCORED when there is no prediction at all', () => {
    expect(
      resolvePointsStatus({ hasPrediction: false, hasScore: false, matchStatus: 'SCHEDULED' }),
    ).toBe('NOT_SCORED');
  });

  it('resolves SCORED whenever a PredictionScore row exists, regardless of match status', () => {
    expect(
      resolvePointsStatus({ hasPrediction: true, hasScore: true, matchStatus: 'FINISHED' }),
    ).toBe('SCORED');
  });

  it('resolves NOT_SCORED for a CANCELLED match with a prediction but no score', () => {
    expect(
      resolvePointsStatus({ hasPrediction: true, hasScore: false, matchStatus: 'CANCELLED' }),
    ).toBe('NOT_SCORED');
  });

  it('resolves NOT_SCORED for a POSTPONED match with a prediction but no score', () => {
    expect(
      resolvePointsStatus({ hasPrediction: true, hasScore: false, matchStatus: 'POSTPONED' }),
    ).toBe('NOT_SCORED');
  });

  it('resolves PENDING_SCORING for a prediction on a match that has not finished/scored yet', () => {
    expect(
      resolvePointsStatus({ hasPrediction: true, hasScore: false, matchStatus: 'SCHEDULED' }),
    ).toBe('PENDING_SCORING');
    expect(
      resolvePointsStatus({ hasPrediction: true, hasScore: false, matchStatus: 'LIVE' }),
    ).toBe('PENDING_SCORING');
  });

  it('resolves PENDING_SCORING for a FINISHED match whose score has not landed yet (lazy-sweep race window)', () => {
    expect(
      resolvePointsStatus({ hasPrediction: true, hasScore: false, matchStatus: 'FINISHED' }),
    ).toBe('PENDING_SCORING');
  });
});
