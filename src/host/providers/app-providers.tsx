import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { useLocaleStore } from '@/host/profile/locale-store';
import { i18n, resolveAndApplyInitialLanguage } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../tamagui.config';

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
 *
 * Bolt 9 (ADR-044/045): `resolveAndApplyInitialLanguage()` runs in the same
 * effect wave — reads the device locale + the `profile.locale` AsyncStorage
 * key and applies the resolved language to the shared `i18next` instance —
 * and `TamaguiProvider` wraps the tree, its `defaultTheme` driven by
 * `useColorScheme()` so light/dark theming exists from the first retrofitted
 * screen, not as a later add-on (design-standards.md).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const hydrateLocale = useLocaleStore(state => state.hydrate);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    hydrateLocale();
    resolveAndApplyInitialLanguage().catch(() => {
      // Best-effort — i18next already has DEFAULT_LOCALE loaded synchronously
      // (platform/i18n/i18n.ts), so a resolution failure here just means the
      // device-detected/stored language never overrides that default.
    });
  }, [hydrateLocale]);

  return (
    <GestureHandlerRootView style={styles.flexFill}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={isDarkMode ? 'dark' : 'light'}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </I18nextProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
});
