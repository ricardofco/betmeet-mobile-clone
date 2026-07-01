import {
  buildFixtureView,
  decidePastDayLingering,
  groupMatchesByDay,
  type Match,
} from '@/domain/competition/fixture-day-grouping';

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

describe('groupMatchesByDay (model.md §2, COMPETITION-1 AC #1)', () => {
  it('partitions matches by LOCAL calendar date, not by a sliding time window', () => {
    // Two matches 20 minutes apart that straddle a local-midnight boundary
    // must land in different day groups.
    const matches = [
      makeMatch({ id: 'm1', kickoffAt: '2026-06-15T23:50:00-05:00' }), // local date 2026-06-15
      makeMatch({ id: 'm2', kickoffAt: '2026-06-16T00:10:00-05:00' }), // local date 2026-06-16
    ];

    const groups = groupMatchesByDay(matches);

    expect(groups).toHaveLength(2);
    expect(groups[0].matches.map(m => m.id)).toEqual(['m1']);
    expect(groups[1].matches.map(m => m.id)).toEqual(['m2']);
  });

  it('groups matches with no kickoffAt under a trailing "unscheduled" bucket', () => {
    const matches = [
      makeMatch({ id: 'm1', kickoffAt: '2026-06-15T12:00:00-05:00' }),
      makeMatch({ id: 'm2', kickoffAt: null }),
    ];

    const groups = groupMatchesByDay(matches);

    expect(groups[groups.length - 1].calendarDate).toBe('unscheduled');
    expect(groups[groups.length - 1].matches.map(m => m.id)).toEqual(['m2']);
  });

  it('sorts day groups chronologically', () => {
    const matches = [
      makeMatch({ id: 'm2', kickoffAt: '2026-06-20T12:00:00-05:00' }),
      makeMatch({ id: 'm1', kickoffAt: '2026-06-15T12:00:00-05:00' }),
    ];

    const groups = groupMatchesByDay(matches);

    expect(groups.map(g => g.calendarDate)).toEqual(['2026-06-15', '2026-06-20']);
  });
});

describe('decidePastDayLingering (model.md §2, the 1-hour linger window)', () => {
  it('stays visible (show-in-current) when more than 1 hour remains before the next kickoff', () => {
    const decision = decidePastDayLingering(
      '2026-06-15T21:00:00Z', // most-recent past day's last kickoff
      '2026-06-16T12:00:00Z', // next upcoming kickoff
      '2026-06-16T08:00:00Z', // now — 4 hours before next kickoff
    );
    expect(decision).toBe('show-in-current');
  });

  it('moves to past exactly at the 1-hour-before-next-kickoff cutoff', () => {
    const decision = decidePastDayLingering(
      '2026-06-15T21:00:00Z',
      '2026-06-16T12:00:00Z',
      '2026-06-16T11:00:00Z', // now === cutoff (next kickoff - 1h)
    );
    expect(decision).toBe('move-to-past');
  });

  it('moves to past once within the 1-hour window before the next kickoff', () => {
    const decision = decidePastDayLingering(
      '2026-06-15T21:00:00Z',
      '2026-06-16T12:00:00Z',
      '2026-06-16T11:30:00Z',
    );
    expect(decision).toBe('move-to-past');
  });

  it('stays visible indefinitely when there is no next upcoming match (nothing to count down to)', () => {
    const decision = decidePastDayLingering('2026-06-15T21:00:00Z', null, '2026-07-01T00:00:00Z');
    expect(decision).toBe('show-in-current');
  });
});

describe('buildFixtureView (model.md §2, COMPETITION-1 AC #2 — full integration)', () => {
  it("keeps today's group in current/upcoming even if all of today's matches already kicked off", () => {
    const matches = [
      makeMatch({ id: 'today-1', kickoffAt: '2026-06-16T08:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'tomorrow-1', kickoffAt: '2026-06-17T08:00:00Z', status: 'SCHEDULED' }),
    ];
    const now = '2026-06-16T20:00:00Z'; // still June 16th, after today's match finished

    const view = buildFixtureView(matches, now);

    const todayGroup = view.currentAndUpcoming.find(g => g.calendarDate === '2026-06-16');
    expect(todayGroup).toBeDefined();
    expect(todayGroup!.matches.map(m => m.id)).toEqual(['today-1']);
    expect(view.past).toHaveLength(0);
  });

  it('moves a day to past once the calendar day has ended and the linger window has elapsed', () => {
    const matches = [
      makeMatch({ id: 'yesterday-1', kickoffAt: '2026-06-15T08:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'next-up', kickoffAt: '2026-06-17T12:00:00Z', status: 'SCHEDULED' }),
    ];
    const now = '2026-06-17T11:30:00Z'; // June 15 fully past AND within 1h of the next kickoff

    const view = buildFixtureView(matches, now);

    expect(view.currentAndUpcoming.find(g => g.calendarDate === '2026-06-15')).toBeUndefined();
    expect(view.past.map(g => g.calendarDate)).toContain('2026-06-15');
  });

  it('with no next-upcoming match at all, a past day has nothing to count down to and stays visible indefinitely (linger rule, model.md §2)', () => {
    const matches = [makeMatch({ id: 'yesterday-1', kickoffAt: '2026-06-15T08:00:00Z', status: 'FINISHED' })];
    const now = '2026-06-16T20:00:00Z';

    const view = buildFixtureView(matches, now);

    expect(view.currentAndUpcoming.map(g => g.calendarDate)).toContain('2026-06-15');
    expect(view.past).toHaveLength(0);
  });

  it('applies the linger window: the most-recent past day stays in current/upcoming until 1h before the next kickoff', () => {
    const matches = [
      makeMatch({ id: 'yesterday-last', kickoffAt: '2026-06-15T21:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'next-up', kickoffAt: '2026-06-17T12:00:00Z', status: 'SCHEDULED' }),
    ];
    // now is June 16th (so June 15th is a fully past calendar day), and more
    // than 1 hour remains before June 17's 12:00 kickoff.
    const now = '2026-06-16T20:00:00Z';

    const view = buildFixtureView(matches, now);

    expect(view.currentAndUpcoming.map(g => g.calendarDate)).toContain('2026-06-15');
    expect(view.past.map(g => g.calendarDate)).not.toContain('2026-06-15');
  });

  it('drops the lingering past day into the past view once within 1h of the next kickoff', () => {
    const matches = [
      makeMatch({ id: 'yesterday-last', kickoffAt: '2026-06-15T21:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'next-up', kickoffAt: '2026-06-17T12:00:00Z', status: 'SCHEDULED' }),
    ];
    const now = '2026-06-17T11:30:00Z'; // within 1h of the next kickoff

    const view = buildFixtureView(matches, now);

    expect(view.past.map(g => g.calendarDate)).toContain('2026-06-15');
    expect(view.currentAndUpcoming.map(g => g.calendarDate)).not.toContain('2026-06-15');
  });

  it('places unresolved knockout slots (no kickoffAt) into current/upcoming, never past', () => {
    const matches = [makeMatch({ id: 'tbd-1', kickoffAt: null })];
    const view = buildFixtureView(matches, '2026-06-16T20:00:00Z');

    expect(view.currentAndUpcoming.some(g => g.calendarDate === 'unscheduled')).toBe(true);
    expect(view.past.some(g => g.calendarDate === 'unscheduled')).toBe(false);
  });

  it('earlier-than-most-recent past days are unconditionally past, unaffected by the linger window', () => {
    const matches = [
      makeMatch({ id: 'two-days-ago', kickoffAt: '2026-06-14T21:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'yesterday', kickoffAt: '2026-06-15T21:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'next-up', kickoffAt: '2026-06-17T12:00:00Z', status: 'SCHEDULED' }),
    ];
    const now = '2026-06-16T20:00:00Z'; // well within the linger window for June 15

    const view = buildFixtureView(matches, now);

    // June 14 is always past, regardless of linger logic (only the single
    // most-recent past day is eligible to linger).
    expect(view.past.map(g => g.calendarDate)).toContain('2026-06-14');
    expect(view.currentAndUpcoming.map(g => g.calendarDate)).toContain('2026-06-15');
  });
});
