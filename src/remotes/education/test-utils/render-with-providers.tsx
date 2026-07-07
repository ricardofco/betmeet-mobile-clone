import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { i18n } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../../tamagui.config';

/**
 * Shared render helper for any `education`-remote component (mirrors
 * `src/remotes/pools/test-utils/render-with-query-client.tsx`, minus
 * `QueryClientProvider` — this remote has zero backend capability/TanStack
 * Query usage, model.md §7/design.md §1.2 point 2). Wraps `TamaguiProvider` +
 * `I18nextProvider` with the app's real shared `i18n` instance, same
 * reasoning as every other retrofitted bundle's copy of this helper.
 *
 * RNTL v14's `render` is async — callers MUST `await` this helper.
 *
 * Forces `i18n.language` to `'en'` before every render for deterministic
 * assertions, same convention as the host/`pools` copies of this helper.
 */
export async function renderWithProviders(ui: ReactElement) {
  await i18n.changeLanguage('en');
  return render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </TamaguiProvider>,
  );
}
