import { render, screen, userEvent } from '@testing-library/react-native';
import { PenaltyWinnerSelector } from '@/host/predictions/components/penalty-winner-selector';

describe('PenaltyWinnerSelector (PREDICTIONS-2)', () => {
  it('renders both team labels as selectable options', async () => {
    await render(
      <PenaltyWinnerSelector
        homeLabel="Germany"
        awayLabel="Netherlands"
        value={null}
        onChange={jest.fn()}
        editable
      />,
    );
    expect(screen.getByText('Germany')).toBeOnTheScreen();
    expect(screen.getByText('Netherlands')).toBeOnTheScreen();
  });

  it('calls onChange with "home" when the home option is pressed', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <PenaltyWinnerSelector homeLabel="Germany" awayLabel="Netherlands" value={null} onChange={onChange} editable />,
    );

    await user.press(screen.getByText('Germany'));

    expect(onChange).toHaveBeenCalledWith('home');
  });

  it('calls onChange with "away" when the away option is pressed', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <PenaltyWinnerSelector homeLabel="Germany" awayLabel="Netherlands" value={null} onChange={onChange} editable />,
    );

    await user.press(screen.getByText('Netherlands'));

    expect(onChange).toHaveBeenCalledWith('away');
  });

  it('marks the currently-selected option via accessibilityState', async () => {
    await render(
      <PenaltyWinnerSelector
        homeLabel="Germany"
        awayLabel="Netherlands"
        value="home"
        onChange={jest.fn()}
        editable
      />,
    );
    const homeOption = screen.getByRole('button', { name: 'Germany' });
    expect(homeOption.props.accessibilityState.selected).toBe(true);
  });

  it('disables options when editable=false', async () => {
    await render(
      <PenaltyWinnerSelector
        homeLabel="Germany"
        awayLabel="Netherlands"
        value={null}
        onChange={jest.fn()}
        editable={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Germany' })).toBeDisabled();
  });
});
