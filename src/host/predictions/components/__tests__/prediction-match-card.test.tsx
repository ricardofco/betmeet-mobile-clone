import { render, screen, userEvent } from '@testing-library/react-native';
import { PredictionMatchCard } from '@/host/predictions/components/prediction-match-card';
import type { Match } from '@/domain/competition';
import type { MatchWithMyPrediction } from '@/domain/predictions';

const HOME_TEAM = { id: 'home', fifaCode: 'GER', name: 'Germany', flagKey: 'ger' };
const AWAY_TEAM = { id: 'away', fifaCode: 'NED', name: 'Netherlands', flagKey: 'ned' };

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    phaseId: 'group-a',
    kickoffAt: '2026-06-20T18:00:00Z',
    status: 'SCHEDULED',
    homeTeam: HOME_TEAM,
    awayTeam: AWAY_TEAM,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

function makeRow(overrides: Partial<MatchWithMyPrediction> = {}): MatchWithMyPrediction {
  return {
    match: makeMatch(),
    prediction: null,
    isKnockout: false,
    ...overrides,
  };
}

const NOW_BEFORE_KICKOFF = '2026-06-20T12:00:00Z';
const NOW_AFTER_KICKOFF = '2026-06-20T19:00:00Z';

describe('PredictionMatchCard (PREDICTIONS-1/2/5)', () => {
  it('renders editable score inputs before kickoff', async () => {
    const row = makeRow();
    await render(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    expect(screen.getByLabelText('Home score')).toBeEnabled();
    expect(screen.getByLabelText('Away score')).toBeEnabled();
  });

  it('locks the inputs and shows lock copy after kickoff (ADR-023: advisory, matches getPredictionEligibility)', async () => {
    const row = makeRow({ match: makeMatch({ kickoffAt: NOW_BEFORE_KICKOFF }) });
    await render(<PredictionMatchCard row={row} now={NOW_AFTER_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    expect(screen.getByLabelText('Home score')).toBeDisabled();
    expect(screen.getByText('Locked — kickoff has passed')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /prediction/i })).not.toBeOnTheScreen();
  });

  it('save button is disabled until both scores are entered', async () => {
    const row = makeRow();
    await render(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    expect(screen.getByRole('button', { name: 'Save prediction' })).toBeDisabled();
  });

  it('calls onSave with a global (poolId: null) prediction once both scores are valid', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    const row = makeRow();
    await render(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={onSave} isSaving={false} />);

    await user.type(screen.getByLabelText('Home score'), '2');
    await user.type(screen.getByLabelText('Away score'), '1');
    await user.press(screen.getByRole('button', { name: 'Save prediction' }));

    expect(onSave).toHaveBeenCalledWith({
      matchId: 'm1',
      poolId: null,
      homeScore: 2,
      awayScore: 1,
      penaltyWinner: null,
    });
  });

  it('shows "Update prediction" label when a prediction already exists', async () => {
    const row = makeRow({
      prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 1, penaltyWinner: null },
    });
    await render(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    expect(screen.getByRole('button', { name: 'Update prediction' })).toBeOnTheScreen();
  });

  it('shows the penalty-winner selector only for a tied knockout match, and requires a pick before saving', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    const row = makeRow({ isKnockout: true });
    await render(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={onSave} isSaving={false} />);

    expect(screen.queryByText('Penalty shootout winner')).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Home score'), '1');
    await user.type(screen.getByLabelText('Away score'), '1');

    expect(screen.getByText('Penalty shootout winner')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save prediction' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Germany' }));
    await user.press(screen.getByRole('button', { name: 'Save prediction' }));

    expect(onSave).toHaveBeenCalledWith({
      matchId: 'm1',
      poolId: null,
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: 'home',
    });
  });

  it('does not show the penalty selector for a tied non-knockout match', async () => {
    const user = userEvent.setup();
    const row = makeRow({ isKnockout: false });
    await render(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    await user.type(screen.getByLabelText('Home score'), '1');
    await user.type(screen.getByLabelText('Away score'), '1');

    expect(screen.queryByText('Penalty shootout winner')).not.toBeOnTheScreen();
  });

  it('renders the score-breakdown panel for a finished match with a prediction', async () => {
    const row = makeRow({
      match: makeMatch({ status: 'FINISHED', homeScore: 2, awayScore: 1 }),
      prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 1, penaltyWinner: null },
    });
    await render(<PredictionMatchCard row={row} now={NOW_AFTER_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    expect(screen.getByText('Exact score')).toBeOnTheScreen();
    expect(screen.getByText('5 pts')).toBeOnTheScreen();
  });

  it('does not render a score-breakdown panel when there is no prediction, even if finished', async () => {
    const row = makeRow({ match: makeMatch({ status: 'FINISHED', homeScore: 2, awayScore: 1 }), prediction: null });
    await render(<PredictionMatchCard row={row} now={NOW_AFTER_KICKOFF} onSave={jest.fn()} isSaving={false} />);

    expect(screen.queryByText('Exact score')).not.toBeOnTheScreen();
  });

  it('shows a loading indicator on the save button while isSaving is true', async () => {
    const row = makeRow();
    const { rerender } = await render(
      <PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={jest.fn()} isSaving />,
    );

    expect(screen.queryByRole('button', { name: 'Save prediction' })).not.toBeOnTheScreen();
    await rerender(<PredictionMatchCard row={row} now={NOW_BEFORE_KICKOFF} onSave={jest.fn()} isSaving={false} />);
    expect(screen.getByRole('button', { name: 'Save prediction' })).toBeOnTheScreen();
  });
});
