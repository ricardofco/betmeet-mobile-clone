/**
 * Liga Mundial Mobile — host app entry component.
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { AppProviders } from '@/host/providers/app-providers';
import { RootNavigator } from '@/host/navigation/root-navigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppProviders>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
