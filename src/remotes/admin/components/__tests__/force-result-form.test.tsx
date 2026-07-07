import { screen, userEvent } from '@testing-library/react-native';
import { ForceResultForm } from '@/remotes/admin/components/force-result-form';
import { renderWithQueryClient } from '@/remotes/admin/test-utils/render-with-query-client';
import type { AdminMatchRow } from '@/domain/admin';

function makeMatch(overrides: Partial<AdminMatchRow> = {}): AdminMatchRow {
  return {
    id: 'm1',
    fifaHome: 'ARG',
    fifaAway: 'FRA',
    homeTeamId: 't-home',
    awayTeamId: 't-away',
    bothTeamsResolved: true,
    isKnockout: false,
    kickoffAt: null,
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    winnerTeamId: null,
    manualOverride: false,
    manualOverrideReason: null,
    overriddenByNickname: null,
    overriddenAt: null,
    ...overrides,
  };
}

describe('ForceResultForm (ADMIN-4, design.md §5.2/§14)', () => {
  it('renders the match label and keeps submit disabled with no reason yet (non-knockout, no penalty section)', async () => {
    await renderWithQueryClient(<ForceResultForm match={makeMatch()} onSubmit={jest.fn()} isSubmitting={false} />);

    expect(screen.getByText('ARG vs FRA')).toBeOnTheScreen();
    expect(screen.queryByText('Penalty shootout')).not.toBeOnTheScreen();
    expect(screen.getByText('Force result')).toBeDisabled();
  });

  it('enables submit once a reason is entered for a non-knockout match, and submits the entered scores', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<ForceResultForm match={makeMatch()} onSubmit={onSubmit} isSubmitting={false} />);

    await user.type(screen.getByLabelText('Home score'), '3');
    await user.type(screen.getByLabelText('Away score'), '1');
    await user.type(screen.getByLabelText('Reason (required)'), 'Provider outage, forcing final score');

    expect(screen.getByText('Force result')).not.toBeDisabled();
    await user.press(screen.getByText('Force result'));

    expect(onSubmit).toHaveBeenCalledWith({
      homeScore: 3,
      awayScore: 1,
      homePenaltyScore: null,
      awayPenaltyScore: null,
      penaltyWinnerTeamId: null,
      reason: 'Provider outage, forcing final score',
    });
  });

  // The same "explicit tied-entries test" discipline as Bolts 10/12: a tied
  // knockout match must show the penalty section and must NOT be
  // submittable while the shootout itself is also tied (an invalid
  // shootout — derivePenaltyWinner returns null, matching
  // ScoringCalculator's own tied-shootout regression).
  it('a tied knockout match requires a resolved (non-tied) penalty winner before submit is enabled', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    const match = makeMatch({ isKnockout: true });
    await renderWithQueryClient(<ForceResultForm match={match} onSubmit={onSubmit} isSubmitting={false} />);

    // Default scores are 0-0 (tied) for a knockout match, so the penalty
    // section is already showing, and so are its own default 0-0 penalty
    // inputs — an invalid tied shootout (the winner placeholder also reads
    // "Penalty shootout" while unresolved, hence getAllByText here).
    expect(screen.getAllByText('Penalty shootout').length).toBeGreaterThan(0);
    expect(screen.getByTestId('force-result-penalty-winner')).toHaveTextContent('Penalty shootout');
    await user.type(screen.getByLabelText('Reason (required)'), 'Forced after a real shootout');
    expect(screen.getByText('Force result')).toBeDisabled();

    await user.type(screen.getByLabelText('Home penalty score'), '5');
    await user.type(screen.getByLabelText('Away penalty score'), '3');

    expect(await screen.findByText('Wins on penalties: ARG')).toBeOnTheScreen();
    expect(screen.getByText('Force result')).not.toBeDisabled();

    await user.press(screen.getByText('Force result'));
    expect(onSubmit).toHaveBeenCalledWith({
      homeScore: 0,
      awayScore: 0,
      homePenaltyScore: 5,
      awayPenaltyScore: 3,
      penaltyWinnerTeamId: 't-home',
      reason: 'Forced after a real shootout',
    });
  });

  it('disables submit while isSubmitting is true even with valid inputs', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<ForceResultForm match={makeMatch()} onSubmit={jest.fn()} isSubmitting />);

    await user.type(screen.getByLabelText('Reason (required)'), 'valid reason');
    expect(screen.getByText('Force result')).toBeDisabled();
  });
});
