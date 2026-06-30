import { screen, userEvent } from '@testing-library/react-native';
import { AccountSettingsScreen } from '@/host/settings/screens/account-settings-screen';
import { profileApi } from '@/platform/backend-api/profile-api';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

jest.mock('@/platform/backend-api/profile-api');

function buildProps(navigate = jest.fn()) {
  return {
    navigation: { navigate, goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof AccountSettingsScreen>[0];
}

describe('AccountSettingsScreen', () => {
  const mockedGetProfile = profileApi.getProfile as jest.MockedFunction<typeof profileApi.getProfile>;

  beforeEach(() => {
    mockedGetProfile.mockReset();
    mockedGetProfile.mockResolvedValue({
      nickname: 'astro#1234',
      avatar: { source: 'default', url: 'asset:avatar-1' },
      locale: 'es',
      cooldown: { onboardingCompleted: true, postOnboardingChangeCount: 0, lastChangeAt: null, now: '' },
    });
  });

  it('renders the Profile and Account settings rows', async () => {
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps()} />);
    expect(await screen.findByText('astro#1234')).toBeOnTheScreen();
    expect(screen.getByText('Nickname')).toBeTruthy();
    expect(screen.getByText('Avatar')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('Change password')).toBeTruthy();
    expect(screen.getByText('Change email')).toBeTruthy();
    expect(screen.getByText('Enable two-factor authentication')).toBeTruthy();
  });

  it('navigates to ChangeNickname when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Nickname'));
    expect(navigate).toHaveBeenCalledWith('ChangeNickname');
  });

  it('navigates to ChangeAvatar when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Avatar'));
    expect(navigate).toHaveBeenCalledWith('ChangeAvatar');
  });

  it('navigates to ChangeLocale when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Language'));
    expect(navigate).toHaveBeenCalledWith('ChangeLocale');
  });

  it('navigates to ChangePassword when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Change password'));
    expect(navigate).toHaveBeenCalledWith('ChangePassword');
  });

  it('navigates to ChangeEmail when that row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Change email'));
    expect(navigate).toHaveBeenCalledWith('ChangeEmail');
  });

  it('navigates to TotpEnrollment when two-factor row is pressed', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Enable two-factor authentication'));
    expect(navigate).toHaveBeenCalledWith('TotpEnrollment');
  });
});
