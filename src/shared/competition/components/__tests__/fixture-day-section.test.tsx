import { render, screen } from '@testing-library/react-native';
import { FixtureDaySectionHeader } from '@/shared/competition/components/fixture-day-section';

describe('FixtureDaySectionHeader (COMPETITION-1 — day-bucket section header)', () => {
  it('renders a formatted local date for a real calendar-date key', async () => {
    await render(<FixtureDaySectionHeader calendarDate="2026-06-16" />);

    // Formatted via `toLocaleDateString` (weekday + month + day) — assert on
    // the day-of-month digits rather than a fully locale-pinned string, since
    // the exact wording depends on the test runner's ICU locale data.
    expect(screen.getByText(/16/)).toBeOnTheScreen();
  });

  it('renders a "to be confirmed" label for the unscheduled sentinel bucket, not a garbage date', async () => {
    await render(<FixtureDaySectionHeader calendarDate="unscheduled" />);

    expect(screen.getByText('Date to be confirmed')).toBeOnTheScreen();
  });
});
