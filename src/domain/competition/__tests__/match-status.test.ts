import { describeMatchStatus, isLiveStatus, type MatchStatus } from '@/domain/competition/match-status';

describe('match-status (model.md §1, COMPETITION-1 AC)', () => {
  const allStatuses: MatchStatus[] = ['SCHEDULED', 'LOCKED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'];

  it('describes every status with a non-empty label', () => {
    for (const status of allStatuses) {
      expect(describeMatchStatus(status).label.length).toBeGreaterThan(0);
    }
  });

  it('only LIVE is flagged as a live status', () => {
    expect(isLiveStatus('LIVE')).toBe(true);
    for (const status of allStatuses.filter(s => s !== 'LIVE')) {
      expect(isLiveStatus(status)).toBe(false);
    }
  });
});
