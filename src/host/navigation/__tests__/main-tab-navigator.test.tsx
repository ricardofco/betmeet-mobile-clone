import { NavigationContainer } from '@react-navigation/native';
import { screen, userEvent } from '@testing-library/react-native';
import { MainTabNavigator } from '@/host/navigation/main-tab-navigator';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

/**
 * ADR-042 — smoke test for the tab bar itself. Only the initially-focused
 * tab (`HomeTab`) actually mounts its screen component (React Navigation's
 * bottom-tabs default `lazy: true`) — `PredictionsTab`/`PoolsTab`'s own
 * screens (which need `predictions-api`/`competition-api` mocks, and a
 * federated-remote import respectively) are deliberately not exercised
 * here; that's `predictions-screen.test.tsx`'s and `pools`' own remote test
 * suites' job. This test only proves the container/tab-bar wiring itself.
 */
describe('MainTabNavigator (ADR-042)', () => {
  it('renders all three translated tab labels and the initial Home tab content', async () => {
    await renderWithQueryClient(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>,
    );

    expect(await screen.findByText('Liga Mundial')).toBeOnTheScreen();
    // Tab bar labels appear at least once each (also duplicated as the
    // native-stack header title of the currently focused tab).
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Predictions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pools').length).toBeGreaterThan(0);
  });

  it('every tab-root screen renders the hamburger menu button (NFR-10.2)', async () => {
    await renderWithQueryClient(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>,
    );

    expect(await screen.findByRole('button', { name: 'Open menu' })).toBeOnTheScreen();
  });

  it('switching tabs keeps each tab on its own stack (back-button-fix structural check, NFR-10.3)', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>,
    );

    await screen.findByText('Liga Mundial');
    await user.press(screen.getAllByText('Predictions')[0]);

    // Predictions tab is now focused; its own header (with a hamburger
    // button, not a "back to Home" button) is shown — Home's tab-bar label
    // still exists (tab bar persists across tab switches).
    expect(await screen.findByRole('button', { name: 'Open menu' })).toBeOnTheScreen();
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
  });

  it('renders a real vector icon per tab, not the default placeholder (Layer 2 finding #1, fixed)', async () => {
    const view = await renderWithQueryClient(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>,
    );

    await screen.findByText('Liga Mundial');

    // `tabBarIcon` renders a `lucide-react-native` icon per tab, which is
    // itself an SVG (`react-native-svg`, confirmed by inspecting its actual
    // rendered host-component tree — `RNSVGSvgView` is the native tag
    // `react-native-svg`'s `<Svg>` renders to) — before this fix, no
    // `tabBarIcon` was set at all, so `@react-navigation/bottom-tabs` fell
    // back to its own generic default (no SVG anywhere in the tab bar).
    const renderedTreeJson = JSON.stringify(view.toJSON());
    const svgCount = renderedTreeJson.split('"RNSVGSvgView"').length - 1;
    expect(svgCount).toBeGreaterThanOrEqual(3);
  });
});
