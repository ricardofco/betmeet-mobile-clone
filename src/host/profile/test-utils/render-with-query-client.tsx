import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

/**
 * Shared render helper for any component that reads `useProfileQuery`/
 * TanStack Query — mirrors `AppProviders`' single-`QueryClient` convention,
 * but with `retry: false` so a mocked rejection resolves to an error state
 * immediately instead of retrying under Jest's fake/real timers.
 *
 * RNTL v14's `render` is async (binds the `screen` global only once its
 * promise resolves) — callers MUST `await` this helper, never call it
 * fire-and-forget, or `screen` queries immediately after will throw
 * "render function has not been called" (react-native-testing skill's
 * "always await" rule).
 */
export async function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
