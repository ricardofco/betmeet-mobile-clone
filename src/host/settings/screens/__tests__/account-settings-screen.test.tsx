import { render, screen, userEvent } from '@testing-library/react-native';
import { AccountSettingsScreen } from '@/host/settings/screens/account-settings-screen';

function buildProps(navigate = jest.fn()) {
  return {
    navigation: { navigate, goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof AccountSettingsScreen>[0];
}

describe('AccountSettingsScreen', () => {
  it('renders the three settings rows', async () => {
    await render(<AccountSettingsScreen {...buildProps()} />);
    expect(screen.getByText('Change password')).toBeTruthy();
    expect(screen.getByText('Change email')).toBeTruthy();
    expect(screen.getByText('Enable two-factor authentication')).toBeTruthy();
  });

  it('navigates to ChangePassword when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await render(<AccountSettingsScreen {...buildProps(navigate)} />);

    await user.press(screen.getByText('Change password'));
    expect(navigate).toHaveBeenCalledWith('ChangePassword');
  });

  it('navigates to ChangeEmail when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await render(<AccountSettingsScreen {...buildProps(navigate)} />);

    await user.press(screen.getByText('Change email'));
    expect(navigate).toHaveBeenCalledWith('ChangeEmail');
  });

  it('navigates to TotpEnrollment when two-factor row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await render(<AccountSettingsScreen {...buildProps(navigate)} />);

    await user.press(screen.getByText('Enable two-factor authentication'));
    expect(navigate).toHaveBeenCalledWith('TotpEnrollment');
  });
});
