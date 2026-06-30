import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLocaleStore } from '@/host/profile/locale-store';

/**
 * ADR-004: TanStack Query is the one path for backend-API-derived state.
 * A single QueryClient instance for the whole host (and, transitively, any
 * remote mounted into it) — remotes must not construct their own.
 */
const queryClient = new QueryClient();

/**
 * Bolt 3 (ADR-013, design.md §4): hydrates the locale store from
 * AsyncStorage as early as possible — before `RootNavigator` mounts — so the
 * first paint already reflects the persisted locale rather than
 * `DEFAULT_LOCALE` followed by a corrective re-render. The existing
 * `AuthGatedNavigator` splash (`status === 'loading'`) already covers the
 * brief async gap; no new splash state is introduced.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const hydrateLocale = useLocaleStore(state => state.hydrate);

  useEffect(() => {
    hydrateLocale();
  }, [hydrateLocale]);

  return (
    <GestureHandlerRootView style={styles.flexFill}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
});
