import { screen } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { ScoreBreakdownPanel } from '@/host/predictions/components/score-breakdown-panel';
import type { ScoreBreakdown } from '@/shared/scoring';

describe('ScoreBreakdownPanel (PREDICTIONS-5)', () => {
  it('renders the outcome label and total points for an EXACT breakdown', async () => {
    const breakdown: ScoreBreakdown = {
      matchedCase: 'EXACT',
      basePoints: 5,
      penaltyApplied: false,
      penaltyPoints: 0,
      totalPoints: 5,
      explanationKey: 'EXACT',
    };
    await renderWithQueryClient(<ScoreBreakdownPanel breakdown={breakdown} />);

    expect(screen.getByText('Exact score')).toBeOnTheScreen();
    expect(screen.getByText('5 pts')).toBeOnTheScreen();
  });

  it('renders the component breakdown when present (non-exact case)', async () => {
    const breakdown: ScoreBreakdown = {
      matchedCase: 'RESULT',
      basePoints: 2,
      penaltyApplied: false,
      penaltyPoints: 0,
      totalPoints: 2,
      explanationKey: 'RESULT',
      components: { resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 0 },
    };
    await renderWithQueryClient(<ScoreBreakdownPanel breakdown={breakdown} />);

    expect(screen.getByText('Correct result')).toBeOnTheScreen();
    expect(screen.getByText('Result: +2')).toBeOnTheScreen();
    expect(screen.getByText('Home goals: +0')).toBeOnTheScreen();
  });

  it('renders the penalty bonus line only when penaltyApplied is true', async () => {
    const breakdown: ScoreBreakdown = {
      matchedCase: 'RESULT',
      basePoints: 2,
      penaltyApplied: true,
      penaltyPoints: 1,
      totalPoints: 3,
      explanationKey: 'RESULT',
      components: { resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 0 },
    };
    await renderWithQueryClient(<ScoreBreakdownPanel breakdown={breakdown} />);

    expect(screen.getByText('Penalty-winner bonus: +1')).toBeOnTheScreen();
  });

  it('does not render a penalty bonus line when penaltyApplied is false', async () => {
    const breakdown: ScoreBreakdown = {
      matchedCase: 'MISS',
      basePoints: 0,
      penaltyApplied: false,
      penaltyPoints: 0,
      totalPoints: 0,
      explanationKey: 'MISS',
      components: { resultPoints: 0, homeGoalPoints: 0, awayGoalPoints: 0 },
    };
    await renderWithQueryClient(<ScoreBreakdownPanel breakdown={breakdown} />);

    expect(screen.queryByText(/Penalty-winner bonus/)).not.toBeOnTheScreen();
  });
});
