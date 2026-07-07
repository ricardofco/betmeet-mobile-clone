import { screen, userEvent } from '@testing-library/react-native';
import { RulesAccordion } from '@/remotes/education/components/rules-accordion';
import { renderWithProviders } from '@/remotes/education/test-utils/render-with-providers';
import { getFullRules } from '@/domain/education/rule-content';

describe('RulesAccordion (EDU-1, design.md §3)', () => {
  it('renders one section per rule document, collapsed by default', async () => {
    await renderWithProviders(<RulesAccordion documents={getFullRules('en')} />);

    expect(screen.getByTestId('rules-section-scoring')).toBeOnTheScreen();
    expect(screen.getByText('Scoring')).toBeOnTheScreen();
    // Collapsed by default — the body text isn't rendered yet.
    expect(screen.queryByText(/Exact score \(home and away\): 5 points\./)).not.toBeOnTheScreen();
  });

  it('expands a section on tap, revealing its content', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RulesAccordion documents={getFullRules('en')} />);

    await user.press(screen.getByTestId('rules-section-scoring-toggle'));

    expect(screen.getByText(/Exact score \(home and away\): 5 points\./)).toBeOnTheScreen();
  });

  it('collapses an expanded section on a second tap', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RulesAccordion documents={getFullRules('en')} />);

    const toggle = screen.getByTestId('rules-section-scoring-toggle');
    await user.press(toggle);
    expect(screen.getByText(/Exact score \(home and away\): 5 points\./)).toBeOnTheScreen();

    await user.press(toggle);
    expect(screen.queryByText(/Exact score \(home and away\): 5 points\./)).not.toBeOnTheScreen();
  });

  it('expanding one section does not affect another (independent local state)', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<RulesAccordion documents={getFullRules('en')} />);

    await user.press(screen.getByTestId('rules-section-scoring-toggle'));

    expect(screen.queryByText(/It only appears in knockout-stage matches\./)).not.toBeOnTheScreen();
  });
});
