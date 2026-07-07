import { screen, userEvent } from '@testing-library/react-native';
import { AccountSettingsScreen } from '@/host/settings/screens/account-settings-screen';
import { profileApi } from '@/platform/backend-api/profile-api';
import { adminApi } from '@/platform/backend-api/admin-api';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

jest.mock('@/platform/backend-api/profile-api');
jest.mock('@/platform/backend-api/admin-api');

function buildProps(navigate = jest.fn()) {
  return {
    navigation: { navigate, goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof AccountSettingsScreen>[0];
}

describe('AccountSettingsScreen', () => {
  const mockedGetProfile = profileApi.getProfile as jest.MockedFunction<typeof profileApi.getProfile>;
  const mockedCheckAccess = adminApi.checkAccess as jest.MockedFunction<typeof adminApi.checkAccess>;

  beforeEach(() => {
    mockedGetProfile.mockReset();
    mockedGetProfile.mockResolvedValue({
      nickname: 'astro#1234',
      avatar: { source: 'default', url: 'asset:avatar-1' },
      locale: 'es',
      cooldown: { onboardingCompleted: true, postOnboardingChangeCount: 0, lastChangeAt: null, now: '' },
    });
    mockedCheckAccess.mockReset();
    // ADMIN-1 (design.md §2.2 point 1) — defaults every pre-existing test in
    // this file to the ~100% case (not an admin), same as production.
    mockedCheckAccess.mockResolvedValue({ isAdmin: false });
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

  it('navigates to DeleteAccount when that row is pressed (Bolt 8, AUTH-6)', async () => {
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    await user.press(screen.getByText('Delete account'));
    expect(navigate).toHaveBeenCalledWith('DeleteAccount');
  });

  // ADMIN-1 (design.md §2.2 point 1/§10, ADR-059) — the Settings-row
  // visibility check. Advisory-only (the real gate is server-side), but
  // genuinely invisible to the ~100% of users who aren't the seeded ADMIN
  // account, and genuinely present + functional for the one who is.
  it('does NOT render the Admin row for a non-admin account (the default/common case)', async () => {
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps()} />);
    await screen.findByText('astro#1234');

    expect(screen.queryByText('Admin')).not.toBeOnTheScreen();
  });

  it('does not render the Admin row while the access check is still pending (no flash of a wrong state)', async () => {
    mockedCheckAccess.mockReturnValue(new Promise(() => {}));
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps()} />);
    await screen.findByText('astro#1234');

    expect(screen.queryByText('Admin')).not.toBeOnTheScreen();
  });

  it('renders the Admin row for an admin account, and navigates to Admin when pressed', async () => {
    mockedCheckAccess.mockResolvedValue({ isAdmin: true });
    const navigate = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<AccountSettingsScreen {...buildProps(navigate)} />);
    await screen.findByText('astro#1234');

    expect(await screen.findByText('Admin')).toBeOnTheScreen();
    await user.press(screen.getByText('Admin'));
    expect(navigate).toHaveBeenCalledWith('Admin');
  });
});
