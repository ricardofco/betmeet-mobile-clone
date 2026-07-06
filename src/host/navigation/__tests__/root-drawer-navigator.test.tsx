import { NavigationContainer } from '@react-navigation/native';
import { screen, userEvent } from '@testing-library/react-native';
import { RootDrawerNavigator } from '@/host/navigation/root-drawer-navigator';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { profileApi } from '@/platform/backend-api/profile-api';

jest.mock('@/platform/backend-api/profile-api');

const mockedProfileApi = profileApi as jest.Mocked<typeof profileApi>;

/**
 * ADR-042 — end-to-end proof of this bolt's two headline deliverables
 * together: (1) `Settings` is reached via the hamburger/drawer, not a tab
 * (NFR-10.2), and (2) once inside `Settings`, the screen has a real header
 * with no missing-back-button defect (NFR-10.3) — `Settings` used to be a
 * direct `AppStack` push with `headerShown: false` and no back affordance;
 * now it's a drawer-mounted stack whose root screen (`AccountSettings`)
 * renders its own header with a title, confirmed here.
 */
describe('RootDrawerNavigator (ADR-042)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedProfileApi.getProfile.mockResolvedValue({
      nickname: 'astro#1234',
      avatar: { source: 'default', url: 'asset:avatar-1' },
      locale: 'es',
      cooldown: { onboardingCompleted: true, postOnboardingChangeCount: 0, lastChangeAt: null, now: '' },
    });
  });

  it('starts on the tab row (Home), with Settings reachable only via the hamburger menu', async () => {
    await renderWithQueryClient(
      <NavigationContainer>
        <RootDrawerNavigator />
      </NavigationContainer>,
    );

    expect(await screen.findByText('Liga Mundial')).toBeOnTheScreen();
    // The Settings *screen's* content (its own title) isn't on screen yet —
    // only reachable by opening the drawer first.
    expect(screen.queryByText('Account settings')).not.toBeOnTheScreen();
  });

  it('opening the hamburger menu and navigating to Settings shows a real header (no missing-back-button defect)', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(
      <NavigationContainer>
        <RootDrawerNavigator />
      </NavigationContainer>,
    );

    await screen.findByText('Liga Mundial');
    await user.press(await screen.findByRole('button', { name: 'Open menu' }));

    // Default drawer content lists both Drawer.Screens by title.
    const settingsDrawerItem = await screen.findByText('Settings');
    await user.press(settingsDrawerItem);

    // AccountSettingsScreen (the Settings stack's root) renders its own
    // header title — confirming Settings is no longer a headerless push.
    expect(await screen.findByText('Account settings')).toBeOnTheScreen();
  });

  it('the Settings root screen (AccountSettings) also has its own hamburger button (Layer 2 finding #5, fixed)', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(
      <NavigationContainer>
        <RootDrawerNavigator />
      </NavigationContainer>,
    );

    await screen.findByText('Liga Mundial');
    await user.press(await screen.findByRole('button', { name: 'Open menu' }));
    await user.press(await screen.findByText('Settings'));
    await screen.findByText('Account settings');

    // React Navigation's Drawer correctly hides the backgrounded `MainTabs`
    // screen from the accessibility tree while `Settings` is focused, so
    // exactly one "Open menu" button is found — AccountSettings' own.
    // Before this fix, `getByRole` here would have thrown "unable to find
    // an element" (AccountSettings had no `headerLeft` at all — a user
    // inside Settings had no way back to the drawer short of a hardware/
    // gesture back action).
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeOnTheScreen();
  });
});
