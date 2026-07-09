import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { PredictionGridCell } from '@/remotes/pools/components/prediction-grid-cell';
import type { PoolMemberPredictionCell } from '@/platform/backend-api/pools-api';

function makeCell(overrides: Partial<PoolMemberPredictionCell> = {}): PoolMemberPredictionCell {
  return {
    matchId: 'm1',
    userId: 'other-1',
    predictedHome: 2,
    predictedAway: 1,
    totalPoints: null,
    matchedCase: null,
    isOverride: false,
    hasGlobal: false,
    hidden: false,
    ...overrides,
  };
}

describe('PredictionGridCell (POOLS-6, ADR-038 — presentational-only masking display)', () => {
  const noop = jest.fn();

  it('shows "Hidden until kickoff" and NEVER renders a score when the cell is hidden', async () => {
    const cell = makeCell({ hidden: true, predictedHome: null, predictedAway: null });
    await renderWithQueryClient(
      <PredictionGridCell
        cell={cell}
        nickname="rival#9999"
        isViewer={false}
        canEdit={false}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.getByText('Hidden until kickoff')).toBeOnTheScreen();
    expect(screen.queryByText('2 - 1')).not.toBeOnTheScreen();
  });

  it('shows the real score for another member once visible (hidden: false, post-kickoff)', async () => {
    const cell = makeCell({ hidden: false });
    await renderWithQueryClient(
      <PredictionGridCell
        cell={cell}
        nickname="rival#9999"
        isViewer={false}
        canEdit={false}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.getByText('2 - 1')).toBeOnTheScreen();
  });

  it('shows "No prediction" when the member has no row for this match at all', async () => {
    await renderWithQueryClient(
      <PredictionGridCell
        cell={undefined}
        nickname="rival#9999"
        isViewer={false}
        canEdit={false}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.getByText('No prediction')).toBeOnTheScreen();
  });

  it('always shows the viewer\'s own prediction, never masked, regardless of kickoff', async () => {
    const cell = makeCell({ userId: 'me', hidden: false });
    await renderWithQueryClient(
      <PredictionGridCell
        cell={cell}
        nickname="me#0001"
        isViewer={true}
        canEdit={false}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.getByText('2 - 1')).toBeOnTheScreen();
  });

  it('shows an editable "Predict"/"Edit" affordance only for the viewer\'s own editable row', async () => {
    const cell = makeCell({ userId: 'me' });
    await renderWithQueryClient(
      <PredictionGridCell
        cell={cell}
        nickname="me#0001"
        isViewer={true}
        canEdit={true}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.getByText('Edit')).toBeOnTheScreen();
  });

  it('calls onSave with the drafted scores when saving the inline editor', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(
      <PredictionGridCell
        cell={undefined}
        nickname="me#0001"
        isViewer={true}
        canEdit={true}
        onSave={onSave}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    await user.press(screen.getByText('Predict'));
    await user.press(screen.getByLabelText('Increase Home'));
    await user.press(screen.getByLabelText('Increase Home'));
    await user.press(screen.getByLabelText('Increase Away'));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(2, 1);
  });

  it('shows "Use global" only when the viewer has both an override AND a global prediction', async () => {
    const cell = makeCell({ userId: 'me', isOverride: true, hasGlobal: true });
    await renderWithQueryClient(
      <PredictionGridCell
        cell={cell}
        nickname="me#0001"
        isViewer={true}
        canEdit={true}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.getByText('Use global')).toBeOnTheScreen();
  });

  it('does not show "Use global" when there is an override but no global prediction', async () => {
    const cell = makeCell({ userId: 'me', isOverride: true, hasGlobal: false });
    await renderWithQueryClient(
      <PredictionGridCell
        cell={cell}
        nickname="me#0001"
        isViewer={true}
        canEdit={true}
        onSave={noop}
        onReset={noop}
        isSaving={false}
        isResetting={false}
      />,
    );

    expect(screen.queryByText('Use global')).not.toBeOnTheScreen();
  });
});
