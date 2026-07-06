import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { i18n } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../../tamagui.config';

/**
 * Shared render helper for any component that reads `useProfileQuery`/
 * TanStack Query — mirrors `AppProviders`' single-`QueryClient` convention,
 * but with `retry: false` so a mocked rejection resolves to an error state
 * immediately instead of retrying under Jest's fake/real timers.
 *
 * Bolt 9 (ADR-044/045): also wraps `I18nextProvider` (with the app's real
 * shared `i18n` instance — without an ancestor Provider, `useTranslation()`
 * falls back to `react-i18next`'s own default global instance, never
 * initialized with this app's resources) and `TamaguiProvider` (component
 * tests render in isolation, without `AppProviders`; Tamagui's `$token`
 * resolution needs a theme from context, not just a registered config).
 *
 * RNTL v14's `render` is async (binds the `screen` global only once its
 * promise resolves) — callers MUST `await` this helper, never call it
 * fire-and-forget, or `screen` queries immediately after will throw
 * "render function has not been called" (react-native-testing skill's
 * "always await" rule).
 *
 * Forces `i18n.language` to `'en'` before every render: the shared `i18n`
 * instance's own default is `'es'` (`DEFAULT_LOCALE`, ADR-012) — that
 * default is normally corrected to the device/stored locale by
 * `AppProviders`' boot-time effect (`resolveAndApplyInitialLanguage`,
 * ADR-044), which isolated component tests never mount. Every pre-existing
 * test in this repo asserts English strings (ported 1:1 from before this
 * bolt's i18n extraction) — defaulting to `en` here keeps them deterministic
 * without editing each one individually.
 */
export async function renderWithQueryClient(ui: ReactElement) {
  await i18n.changeLanguage('en');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </I18nextProvider>
    </TamaguiProvider>,
  );
}
