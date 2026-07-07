import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { i18n } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../../tamagui.config';

/**
 * Shared render helper for any `admin`-remote component/screen — mirrors
 * `src/remotes/pools/test-utils/render-with-query-client.tsx`/
 * `src/host/profile/test-utils/render-with-query-client.tsx` exactly (same
 * `retry: false` reasoning, same duplicated-not-shared discipline since this
 * is yet another bundle with no filesystem-shared test-utility tier).
 *
 * RNTL v14's `render` is async — callers MUST `await` this helper.
 *
 * Forces `i18n.language` to `'en'` before every render, same reasoning as
 * every other copy of this helper (`DEFAULT_LOCALE` is `'es'`; every test in
 * this bundle asserts English strings).
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
