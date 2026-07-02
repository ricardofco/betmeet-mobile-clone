import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

/**
 * Shared render helper for any pools-remote component that reads TanStack
 * Query — mirrors `src/host/profile/test-utils/render-with-query-client.tsx`
 * exactly (same `retry: false` reasoning), duplicated here because this is
 * a different bundle (`src/remotes/pools/`) with no filesystem-shared test
 * utility tier yet (see design.md §3 — no `src/shared/pools/` either, same
 * "promote on second consumer" discipline).
 *
 * RNTL v14's `render` is async — callers MUST `await` this helper.
 */
export async function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
