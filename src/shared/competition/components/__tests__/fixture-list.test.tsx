import { render, screen, userEvent } from '@testing-library/react-native';
import { FixtureList } from '@/shared/competition/components/fixture-list';
import { buildFixtureView, type Match } from '@/domain/competition';

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phaseId: 'group-stage',
    kickoffAt: '2026-06-16T18:00:00Z',
    status: 'SCHEDULED',
    homeTeam: { id: 'h', fifaCode: 'GER', name: 'Germany', flagKey: 'de' },
    awayTeam: { id: 'a', fifaCode: 'NED', name: 'Netherlands', flagKey: 'nl' },
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

describe('FixtureList (COMPETITION-1 AC — day-grouped fixture screen)', () => {
  it('renders day section headers and match cards for current/upcoming matches', async () => {
    const matches = [makeMatch({ id: 'm1', kickoffAt: '2026-06-16T18:00:00Z' })];
    const view = buildFixtureView(matches, '2026-06-16T12:00:00Z');

    await render(<FixtureList view={view} showPastMatches={false} onTogglePastMatches={jest.fn()} />);

    expect(screen.getByText('Germany')).toBeOnTheScreen();
    expect(screen.getByText('Netherlands')).toBeOnTheScreen();
  });

  it('does not show the past-matches toggle when there are no past matches', async () => {
    const matches = [makeMatch({ id: 'm1', kickoffAt: '2026-06-16T18:00:00Z' })];
    const view = buildFixtureView(matches, '2026-06-16T12:00:00Z');

    await render(<FixtureList view={view} showPastMatches={false} onTogglePastMatches={jest.fn()} />);

    expect(screen.queryByText('Show past matches')).toBeNull();
  });

  // Two distinct past days: only the earliest is used to assert "is in
  // `past`" cleanly, since it is unconditionally past (the linger window
  // only ever applies to the single most-recent past day — model.md §2).
  it('shows the past-matches toggle and hides past matches by default when past matches exist', async () => {
    const matches = [
      makeMatch({ id: 'long-past-1', kickoffAt: '2026-06-01T18:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'recent-past-1', kickoffAt: '2026-06-10T18:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'future-1', kickoffAt: '2026-06-20T18:00:00Z' }),
    ];
    const view = buildFixtureView(matches, '2026-06-16T12:00:00Z');

    await render(<FixtureList view={view} showPastMatches={false} onTogglePastMatches={jest.fn()} />);

    expect(screen.getByText('Show past matches')).toBeOnTheScreen();
  });

  it('calls onTogglePastMatches when the toggle is pressed', async () => {
    const matches = [
      makeMatch({ id: 'long-past-1', kickoffAt: '2026-06-01T18:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'recent-past-1', kickoffAt: '2026-06-10T18:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'future-1', kickoffAt: '2026-06-20T18:00:00Z' }),
    ];
    const view = buildFixtureView(matches, '2026-06-16T12:00:00Z');
    const onTogglePastMatches = jest.fn();
    const user = userEvent.setup();

    await render(<FixtureList view={view} showPastMatches={false} onTogglePastMatches={onTogglePastMatches} />);
    await user.press(screen.getByText('Show past matches'));

    expect(onTogglePastMatches).toHaveBeenCalledTimes(1);
  });

  it('shows past matches and the "Hide" label when showPastMatches is true', async () => {
    const matches = [
      makeMatch({
        id: 'long-past-1',
        kickoffAt: '2026-06-01T18:00:00Z',
        status: 'FINISHED',
        homeTeam: { id: 'h2', fifaCode: 'BRA', name: 'Brazil', flagKey: 'br' },
      }),
      makeMatch({ id: 'recent-past-1', kickoffAt: '2026-06-10T18:00:00Z', status: 'FINISHED' }),
      makeMatch({ id: 'future-1', kickoffAt: '2026-06-20T18:00:00Z' }),
    ];
    const view = buildFixtureView(matches, '2026-06-16T12:00:00Z');

    await render(<FixtureList view={view} showPastMatches onTogglePastMatches={jest.fn()} />);

    expect(screen.getByText('Hide past matches')).toBeOnTheScreen();
    expect(screen.getByText('Brazil')).toBeOnTheScreen();
  });
});
