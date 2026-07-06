import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { i18n } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../../tamagui.config';

/**
 * Shared render helper for any pools-remote component that reads TanStack
 * Query — mirrors `src/host/profile/test-utils/render-with-query-client.tsx`
 * exactly (same `retry: false` reasoning), duplicated here because this is
 * a different bundle (`src/remotes/pools/`) with no filesystem-shared test
 * utility tier yet (see design.md §3 — no `src/shared/pools/` either, same
 * "promote on second consumer" discipline).
 *
 * Bolt 9 (ADR-043/044/045): also wraps `I18nextProvider` and
 * `TamaguiProvider` — `pools`' own screens now call `useTranslation()`/
 * Tamagui components directly (the MF `tamagui`/`i18next` shared
 * singletons this bolt wires), same reasoning as the host's copy of this
 * helper.
 *
 * RNTL v14's `render` is async — callers MUST `await` this helper.
 *
 * Forces `i18n.language` to `'en'` before every render, same reasoning as
 * the host's copy of this helper (`DEFAULT_LOCALE` is `'es'`; every
 * pre-existing test here asserts English strings).
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
