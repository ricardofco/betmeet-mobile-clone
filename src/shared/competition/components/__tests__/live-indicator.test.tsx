import { render, screen } from '@testing-library/react-native';
import { LiveIndicator } from '@/shared/competition/components/live-indicator';

describe('LiveIndicator (design.md §2.1 — isolated live-state pill)', () => {
  it('renders the LIVE label, accessible by role/label', async () => {
    await render(<LiveIndicator />);

    expect(screen.getByLabelText('Live')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeOnTheScreen();
  });
});
