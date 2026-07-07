import { screen } from '@testing-library/react-native';
import { OnboardingScoringSummary } from '@/host/profile/components/onboarding-scoring-summary';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

describe('OnboardingScoringSummary (EDU-3, ADR-054 twin)', () => {
  it('renders all 5 rule→points rows', async () => {
    await renderWithQueryClient(<OnboardingScoringSummary />);

    expect(screen.getByText('Exact score')).toBeOnTheScreen();
    expect(screen.getByText('5 points')).toBeOnTheScreen();
    expect(screen.getByText('Correct result (+2 points)')).toBeOnTheScreen();
    expect(screen.getByText('Matched team goals (+1 point each)')).toBeOnTheScreen();
    expect(screen.getByText('You miss everything')).toBeOnTheScreen();
    expect(screen.getByText('Bonus for guessing the penalty winner')).toBeOnTheScreen();
  });
});
