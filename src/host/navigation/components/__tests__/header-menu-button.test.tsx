import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { HeaderMenuButton } from '@/host/navigation/components/header-menu-button';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

const Drawer = createDrawerNavigator();

function MainScreen() {
  return (
    <>
      <Text>Main content</Text>
      <HeaderMenuButton />
    </>
  );
}

function SettingsScreen() {
  return <Text>Settings content</Text>;
}

function TestDrawer() {
  return (
    <NavigationContainer>
      <Drawer.Navigator>
        <Drawer.Screen name="Main" component={MainScreen} />
        <Drawer.Screen name="Settings" component={SettingsScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

/**
 * ADR-042 — `HeaderMenuButton` dispatches `DrawerActions.openDrawer()`,
 * which React Navigation bubbles up to the nearest ancestor drawer
 * navigator. Tested here against a real (if minimal) `Drawer.Navigator`
 * rather than mocking `useNavigation`, so this proves the actual bubbling
 * behavior this bolt relies on, not just that a function was called.
 */
describe('HeaderMenuButton (ADR-042)', () => {
  it('opens the drawer when pressed, revealing the Settings drawer item', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<TestDrawer />);

    expect(screen.getByText('Main content')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Open menu' }));

    expect(await screen.findByText('Settings')).toBeOnTheScreen();
  });
});
