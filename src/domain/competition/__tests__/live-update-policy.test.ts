import { computeDebounceDeadline, evaluateLiveUpdateRelevance } from '@/domain/competition/live-update-policy';
import type { Match } from '@/domain/competition/fixture-day-grouping';

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phaseId: 'group-stage',
    kickoffAt: null,
    status: 'SCHEDULED',
    homeTeam: null,
    awayTeam: null,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

describe('evaluateLiveUpdateRelevance (model.md §3, COMPETITION-2 AC #2, domain-overview.md §5.9 heuristic)', () => {
  const now = '2026-06-16T12:00:00Z';

  it('is active when any match is LIVE, regardless of kickoff time', () => {
    const matches = [makeMatch({ id: 'm1', status: 'LIVE', kickoffAt: '2026-01-01T00:00:00Z' })];
    expect(evaluateLiveUpdateRelevance(matches, now)).toBe('active');
  });

  it('is active when a match kicks off within the next 3 hours', () => {
    const matches = [makeMatch({ id: 'm1', status: 'SCHEDULED', kickoffAt: '2026-06-16T14:30:00Z' })];
    expect(evaluateLiveUpdateRelevance(matches, now)).toBe('active');
  });

  it('is active when a match kicked off within the past 3 hours', () => {
    const matches = [makeMatch({ id: 'm1', status: 'FINISHED', kickoffAt: '2026-06-16T09:30:00Z' })];
    expect(evaluateLiveUpdateRelevance(matches, now)).toBe('active');
  });

  it('is inactive when nothing is live and nothing is within ±3 hours of kickoff', () => {
    const matches = [makeMatch({ id: 'm1', status: 'SCHEDULED', kickoffAt: '2026-06-20T12:00:00Z' })];
    expect(evaluateLiveUpdateRelevance(matches, now)).toBe('inactive');
  });

  it('is inactive for an empty match list', () => {
    expect(evaluateLiveUpdateRelevance([], now)).toBe('inactive');
  });

  it('is inactive for matches with no kickoffAt and non-LIVE status (unresolved knockout slots)', () => {
    const matches = [makeMatch({ id: 'm1', status: 'SCHEDULED', kickoffAt: null })];
    expect(evaluateLiveUpdateRelevance(matches, now)).toBe('inactive');
  });

  it('is active at exactly the 3-hour boundary', () => {
    const matches = [makeMatch({ id: 'm1', status: 'SCHEDULED', kickoffAt: '2026-06-16T15:00:00Z' })];
    expect(evaluateLiveUpdateRelevance(matches, now)).toBe('active');
  });
});

describe('computeDebounceDeadline (model.md §3, COMPETITION-2 AC #1 — refetch-storm prevention)', () => {
  it('schedules a deadline windowMs after the first signal when nothing is pending', () => {
    const deadline = computeDebounceDeadline(1000, 500, null);
    expect(deadline).toBe(1500);
  });

  it('coalesces a second signal into the later of the two candidate deadlines, never scheduling a second independent refetch', () => {
    const first = computeDebounceDeadline(1000, 500, null); // 1500
    const second = computeDebounceDeadline(1200, 500, first); // candidate 1700, pending 1500 -> 1700
    expect(second).toBe(1700);
  });

  it('does not regress the deadline earlier when a later signal would resolve sooner than the pending one', () => {
    const pending = 5000;
    const result = computeDebounceDeadline(1000, 500, pending); // candidate 1500 < pending 5000
    expect(result).toBe(pending);
  });
});
