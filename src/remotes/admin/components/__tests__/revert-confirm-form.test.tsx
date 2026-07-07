import { screen, userEvent } from '@testing-library/react-native';
import { RevertConfirmForm } from '@/remotes/admin/components/revert-confirm-form';
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
    isKnockout: true,
    kickoffAt: null,
    status: 'FINISHED',
    homeScore: 2,
    awayScore: 2,
    homePenaltyScore: 5,
    awayPenaltyScore: 3,
    winnerTeamId: 't-home',
    manualOverride: true,
    manualOverrideReason: 'Data provider outage',
    overriddenByNickname: 'admin#0001',
    overriddenAt: '2026-07-06T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * ADMIN-5's type-to-confirm gate (design.md §5.2/§14, ADR-061) — the single
 * highest-blast-radius mutation in the whole plan. The most important
 * behavior to prove: the Confirm button stays disabled until the EXACT
 * FIFA codes are typed, and the typed text never reaches `onConfirm`
 * (it is purely a client-side friction device, ADR-061's own invariant —
 * `useRevertOverrideMutation` only ever sends `{ matchId }`).
 */
describe('RevertConfirmForm (ADMIN-5, ADR-061)', () => {
  it('renders the current forced result, who overrode it, and the mandatory warning', async () => {
    await renderWithQueryClient(
      <RevertConfirmForm match={makeMatch()} onConfirm={jest.fn()} isSubmitting={false} />,
    );

    expect(screen.getByText('ARG vs FRA')).toBeOnTheScreen();
    expect(screen.getByText(/2 - 2/)).toBeOnTheScreen();
    expect(screen.getByText(/5-3 pens/)).toBeOnTheScreen();
    expect(screen.getByText(/admin#0001/)).toBeOnTheScreen();
    expect(screen.getByText('Data provider outage')).toBeOnTheScreen();
    expect(
      screen.getByText('This cannot be undone. No results feed will repopulate this match — reverting deletes every prediction score for it.'),
    ).toBeOnTheScreen();
  });

  it('keeps Confirm disabled until the exact FIFA codes are typed', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(
      <RevertConfirmForm match={makeMatch()} onConfirm={onConfirm} isSubmitting={false} />,
    );

    const input = screen.getByLabelText("Type this match's FIFA codes to confirm: ARG-FRA");
    expect(screen.getByText('Revert override')).toBeDisabled();

    await user.type(input, 'ARG');
    expect(screen.getByText('Revert override')).toBeDisabled();

    await user.type(input, '-FR');
    expect(screen.getByText('Revert override')).toBeDisabled();

    await user.press(screen.getByText('Revert override'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('enables Confirm only once the exact codes are typed (case-insensitive), and never sends the typed text to onConfirm', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(
      <RevertConfirmForm match={makeMatch()} onConfirm={onConfirm} isSubmitting={false} />,
    );

    const input = screen.getByLabelText("Type this match's FIFA codes to confirm: ARG-FRA");
    await user.type(input, 'arg-fra');

    expect(screen.getByText('Revert override')).not.toBeDisabled();
    await user.press(screen.getByText('Revert override'));

    // onConfirm takes no arguments at all — the typed confirmation text
    // never travels anywhere near the mutation (ADR-061's invariant).
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith();
  });

  it('does not accept a wrong or partial match as confirmation', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(
      <RevertConfirmForm match={makeMatch()} onConfirm={onConfirm} isSubmitting={false} />,
    );

    const input = screen.getByLabelText("Type this match's FIFA codes to confirm: ARG-FRA");
    await user.type(input, 'FRA-ARG');

    expect(screen.getByText('Revert override')).toBeDisabled();
    await user.press(screen.getByText('Revert override'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables Confirm while isSubmitting is true even with the exact codes typed', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(
      <RevertConfirmForm match={makeMatch()} onConfirm={jest.fn()} isSubmitting />,
    );

    const input = screen.getByLabelText("Type this match's FIFA codes to confirm: ARG-FRA");
    await user.type(input, 'ARG-FRA');
    expect(screen.getByText('Revert override')).toBeDisabled();
  });
});
