import { screen, userEvent } from '@testing-library/react-native';
import { ScoringCalculator } from '@/remotes/education/components/scoring-calculator';
import { renderWithProviders } from '@/remotes/education/test-utils/render-with-providers';

describe('ScoringCalculator (EDU-2, model.md §3, design.md §4)', () => {
  it('computes the initial breakdown from the default fields (exact score + matched penalty winner)', async () => {
    await renderWithProviders(<ScoringCalculator />);

    // Default: predicted 2-2 vs actual 2-2 (EXACT, 5 pts) + matched penalty
    // winner ('home' both sides, 4-3 vs 4-2) → +1 penalty bonus → 6 total.
    expect(screen.getByTestId('score-breakdown-total')).toHaveTextContent('6');
  });

  it('recomputes live when the actual result changes, hiding the penalty section once no longer tied', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ScoringCalculator />);

    const actualHomeInput = screen.getByLabelText('Actual result – Home');
    await user.clear(actualHomeInput);
    await user.type(actualHomeInput, '3');

    // predicted 2-2 vs actual 3-2: away goals match only → PARTIAL, +1; no
    // longer tied at full time → no penalty shootout, no bonus. Total: 1.
    expect(screen.getByTestId('score-breakdown-total')).toHaveTextContent('1');
    expect(screen.queryByText('Penalty shootout')).not.toBeOnTheScreen();
  });

  it('flags a tied predicted penalty shootout as invalid instead of picking a winner', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ScoringCalculator />);

    const predictedPenaltyAway = screen.getByLabelText('Penalty shootout Your prediction – Away');
    await user.clear(predictedPenaltyAway);
    await user.type(predictedPenaltyAway, '4'); // 4-4: a tied shootout

    expect(screen.getByTestId('calculator-predicted-penalty-tie')).toBeOnTheScreen();
    expect(screen.queryByTestId('calculator-predicted-penalty-winner')).not.toBeOnTheScreen();
    // The penalty bonus no longer applies once the predicted winner is
    // invalid (null) — total drops from 6 to the base 5 (still EXACT).
    expect(screen.getByTestId('score-breakdown-total')).toHaveTextContent('5');
  });

  it('toggling knockout off hides the penalty shootout section entirely', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ScoringCalculator />);

    expect(screen.getByText('Penalty shootout')).toBeOnTheScreen();
    await user.press(screen.getByTestId('calculator-knockout'));
    expect(screen.queryByText('Penalty shootout')).not.toBeOnTheScreen();
  });
});
