import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { PredictionMatchCard } from '@/host/predictions/components/prediction-match-card';
import type { Match } from '@/domain/competition';
import type { MatchWithMyPrediction, MyPrediction } from '@/domain/predictions';
import type { PoolPickerEntry } from '@/domain/pools';

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

type RenderCardOptions = {
  row: MatchWithMyPrediction;
  now: string;
  onSave?: jest.Mock;
  isSaving?: boolean;
  pools?: PoolPickerEntry[];
  poolOverrides?: MyPrediction[];
  onResetOverride?: jest.Mock;
  isResettingOverride?: boolean;
};

/** Bolt 8 (PREDICTIONS-3/4) added `pools`/`poolOverrides`/`onResetOverride`/
 * `isResettingOverride` as required props — this helper keeps every
 * pre-existing Bolt 6 test call site terse by defaulting them to the
 * "no pools" case, which reproduces this bolt's exact prior behavior. */
function renderCard({
  row,
  now,
  onSave = jest.fn(),
  isSaving = false,
  pools = [],
  poolOverrides = [],
  onResetOverride = jest.fn(),
  isResettingOverride = false,
}: RenderCardOptions) {
  return renderWithQueryClient(
    <PredictionMatchCard
      row={row}
      now={now}
      onSave={onSave}
      isSaving={isSaving}
      pools={pools}
      poolOverrides={poolOverrides}
      onResetOverride={onResetOverride}
      isResettingOverride={isResettingOverride}
    />,
  );
}

describe('PredictionMatchCard (PREDICTIONS-1/2/5)', () => {
  it('renders editable score inputs before kickoff', async () => {
    const row = makeRow();
    await renderCard({ row, now: NOW_BEFORE_KICKOFF });

    expect(screen.getByLabelText('Home score')).toBeEnabled();
    expect(screen.getByLabelText('Away score')).toBeEnabled();
  });

  it('locks the inputs and shows lock copy after kickoff (ADR-023: advisory, matches getPredictionEligibility)', async () => {
    const row = makeRow({ match: makeMatch({ kickoffAt: NOW_BEFORE_KICKOFF }) });
    await renderCard({ row, now: NOW_AFTER_KICKOFF });

    expect(screen.getByLabelText('Home score')).toBeDisabled();
    expect(screen.getByText('Locked — kickoff has passed')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /prediction/i })).not.toBeOnTheScreen();
  });

  it('save button is disabled until both scores are entered', async () => {
    const row = makeRow();
    await renderCard({ row, now: NOW_BEFORE_KICKOFF });

    expect(screen.getByRole('button', { name: 'Save prediction' })).toBeDisabled();
  });

  it('calls onSave with a global (poolId: null) prediction once both scores are valid', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    const row = makeRow();
    await renderCard({ row, now: NOW_BEFORE_KICKOFF, onSave });

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
      prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 1, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
    });
    await renderCard({ row, now: NOW_BEFORE_KICKOFF });

    expect(screen.getByRole('button', { name: 'Update prediction' })).toBeOnTheScreen();
  });

  it('shows the penalty-winner selector only for a tied knockout match, and requires a pick before saving', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    const row = makeRow({ isKnockout: true });
    await renderCard({ row, now: NOW_BEFORE_KICKOFF, onSave });

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
    await renderCard({ row, now: NOW_BEFORE_KICKOFF });

    await user.type(screen.getByLabelText('Home score'), '1');
    await user.type(screen.getByLabelText('Away score'), '1');

    expect(screen.queryByText('Penalty shootout winner')).not.toBeOnTheScreen();
  });

  it('renders the score-breakdown panel for a finished match with a prediction', async () => {
    const row = makeRow({
      match: makeMatch({ status: 'FINISHED', homeScore: 2, awayScore: 1 }),
      prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 1, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
    });
    await renderCard({ row, now: NOW_AFTER_KICKOFF });

    expect(screen.getByText('Exact score')).toBeOnTheScreen();
    expect(screen.getByText('5 pts')).toBeOnTheScreen();
  });

  it('does not render a score-breakdown panel when there is no prediction, even if finished', async () => {
    const row = makeRow({ match: makeMatch({ status: 'FINISHED', homeScore: 2, awayScore: 1 }), prediction: null });
    await renderCard({ row, now: NOW_AFTER_KICKOFF });

    expect(screen.queryByText('Exact score')).not.toBeOnTheScreen();
  });

  it('shows a loading indicator on the save button while isSaving is true', async () => {
    const row = makeRow();
    const { rerender } = await renderCard({ row, now: NOW_BEFORE_KICKOFF, isSaving: true });

    expect(screen.queryByRole('button', { name: 'Save prediction' })).not.toBeOnTheScreen();
    await rerender(
      <PredictionMatchCard
        row={row}
        now={NOW_BEFORE_KICKOFF}
        onSave={jest.fn()}
        isSaving={false}
        pools={[]}
        poolOverrides={[]}
        onResetOverride={jest.fn()}
        isResettingOverride={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save prediction' })).toBeOnTheScreen();
  });

  describe('pointsStatus badge (Bolt 10, design.md §8 — additive, backend-authoritative)', () => {
    it('shows a "Scored" badge when the prediction\'s pointsStatus is SCORED', async () => {
      const row = makeRow({
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 1, penaltyWinner: null, pointsStatus: 'SCORED' },
      });
      await renderCard({ row, now: NOW_BEFORE_KICKOFF });

      expect(screen.getByText('Scored')).toBeOnTheScreen();
      expect(screen.queryByText('Pending')).not.toBeOnTheScreen();
    });

    it('shows a "Pending" badge when the prediction\'s pointsStatus is PENDING_SCORING', async () => {
      const row = makeRow({
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 1, penaltyWinner: null, pointsStatus: 'PENDING_SCORING' },
      });
      await renderCard({ row, now: NOW_BEFORE_KICKOFF });

      expect(screen.getByText('Pending')).toBeOnTheScreen();
      expect(screen.queryByText('Scored')).not.toBeOnTheScreen();
    });

    it('renders no badge at all when the prediction\'s pointsStatus is NOT_SCORED (the common no-prediction-yet case)', async () => {
      const row = makeRow({
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 1, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
      });
      await renderCard({ row, now: NOW_BEFORE_KICKOFF });

      expect(screen.queryByText('Scored')).not.toBeOnTheScreen();
      expect(screen.queryByText('Pending')).not.toBeOnTheScreen();
    });

    it('renders no badge at all when there is no prediction (pointsStatus does not apply)', async () => {
      const row = makeRow({ prediction: null });
      await renderCard({ row, now: NOW_BEFORE_KICKOFF });

      expect(screen.queryByText('Scored')).not.toBeOnTheScreen();
      expect(screen.queryByText('Pending')).not.toBeOnTheScreen();
    });

    it('does not affect the pre-existing score-breakdown panel (canShowScoreBreakdown/buildScoreBreakdown untouched)', async () => {
      // A SCORED, finished-match prediction should show BOTH the badge AND
      // the still-independent client-side breakdown panel (design.md §8's
      // explicit "does not touch canShowScoreBreakdown" guarantee).
      const row = makeRow({
        match: makeMatch({ status: 'FINISHED', homeScore: 2, awayScore: 1 }),
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 1, penaltyWinner: null, pointsStatus: 'SCORED' },
      });
      await renderCard({ row, now: NOW_AFTER_KICKOFF });

      expect(screen.getByText('Scored')).toBeOnTheScreen();
      expect(screen.getByText('Exact score')).toBeOnTheScreen();
      expect(screen.getByText('5 pts')).toBeOnTheScreen();
    });
  });

  describe('pool override (PREDICTIONS-3/4, Bolt 8)', () => {
    const pools: PoolPickerEntry[] = [{ id: 'pool-1', name: 'Office League' }];

    it('does not render the pool picker when the viewer belongs to no pools', async () => {
      const row = makeRow();
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools: [] });

      expect(screen.queryByText('Office League')).not.toBeOnTheScreen();
    });

    it('renders a chip per pool plus a Global chip when the viewer belongs to pools', async () => {
      const row = makeRow();
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools });

      expect(screen.getByText('Global')).toBeOnTheScreen();
      expect(screen.getByText('Office League')).toBeOnTheScreen();
    });

    it('selecting a pool with no existing override or global pre-fills empty and offers dual-save', async () => {
      const user = userEvent.setup();
      const row = makeRow();
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools });

      await user.press(screen.getByText('Office League'));

      expect(screen.getByLabelText('Also save as my global prediction')).toBeOnTheScreen();
    });

    it('selecting a pool with an existing global but no override pre-fills the global values and does NOT offer dual-save', async () => {
      const user = userEvent.setup();
      const row = makeRow({
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 0, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
      });
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools });

      await user.press(screen.getByText('Office League'));

      expect(screen.getByLabelText('Home score').props.value).toBe('2');
      expect(screen.getByLabelText('Away score').props.value).toBe('0');
      expect(screen.queryByLabelText('Also save as my global prediction')).not.toBeOnTheScreen();
    });

    it('calls onSave with the selected poolId and alsoSaveAsGlobal when dual-save is checked', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      const row = makeRow();
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools, onSave });

      await user.press(screen.getByText('Office League'));
      await user.type(screen.getByLabelText('Home score'), '3');
      await user.type(screen.getByLabelText('Away score'), '1');
      fireEvent(screen.getByLabelText('Also save as my global prediction'), 'valueChange', true);
      await user.press(screen.getByRole('button', { name: 'Save override' }));

      expect(onSave).toHaveBeenCalledWith({
        matchId: 'm1',
        poolId: 'pool-1',
        homeScore: 3,
        awayScore: 1,
        penaltyWinner: null,
        alsoSaveAsGlobal: true,
      });
    });

    it('shows "Use global prediction" only when both an override and a global exist for the selected pool', async () => {
      const user = userEvent.setup();
      const row = makeRow({
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 0, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
      });
      const poolOverrides: MyPrediction[] = [
        { id: 'p2', matchId: 'm1', poolId: 'pool-1', homeScore: 1, awayScore: 1, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
      ];
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools, poolOverrides });

      await user.press(screen.getByText('Office League'));

      expect(screen.getByText('Use global prediction')).toBeOnTheScreen();
    });

    it('calls onResetOverride with the selected pool when "Use global prediction" is pressed', async () => {
      const onResetOverride = jest.fn();
      const user = userEvent.setup();
      const row = makeRow({
        prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 2, awayScore: 0, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
      });
      const poolOverrides: MyPrediction[] = [
        { id: 'p2', matchId: 'm1', poolId: 'pool-1', homeScore: 1, awayScore: 1, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
      ];
      await renderCard({ row, now: NOW_BEFORE_KICKOFF, pools, poolOverrides, onResetOverride });

      await user.press(screen.getByText('Office League'));
      await user.press(screen.getByText('Use global prediction'));

      expect(onResetOverride).toHaveBeenCalledWith({ matchId: 'm1', poolId: 'pool-1' });
    });
  });
});
