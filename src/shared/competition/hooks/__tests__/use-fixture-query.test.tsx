import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useFixtureQuery, useFixtureView, useInvalidateFixtureQuery } from '@/shared/competition/hooks/use-fixture-query';
import { competitionApi } from '@/platform/backend-api/competition-api';
import type { Match } from '@/domain/competition';

jest.mock('@/platform/backend-api/competition-api');

const mockedCompetitionApi = competitionApi as jest.Mocked<typeof competitionApi>;

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phaseId: 'group-stage',
    kickoffAt: '2026-06-16T18:00:00Z',
    status: 'SCHEDULED',
    homeTeam: null,
    awayTeam: null,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

describe('useFixtureQuery / useFixtureView (design.md §3.1, ADR-019)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the flat match list via competitionApi.getFixture', async () => {
    const matches = [makeMatch({ id: 'm1' })];
    mockedCompetitionApi.getFixture.mockResolvedValue(matches);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useFixtureQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(matches));
    expect(mockedCompetitionApi.getFixture).toHaveBeenCalledTimes(1);
  });

  it('useFixtureView derives a grouped FixtureView from the flat list, not a second query', async () => {
    const matches = [makeMatch({ id: 'm1', kickoffAt: '2026-06-16T18:00:00Z' })];
    mockedCompetitionApi.getFixture.mockResolvedValue(matches);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useFixtureView('2026-06-16T12:00:00Z'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.view).toBeDefined());
    expect(result.current.view!.currentAndUpcoming[0].matches.map(m => m.id)).toEqual(['m1']);
    // Still exactly one network call — the grouped view is derived, not fetched separately (ADR-019).
    expect(mockedCompetitionApi.getFixture).toHaveBeenCalledTimes(1);
  });

  it('useInvalidateFixtureQuery triggers a refetch through the same query key', async () => {
    mockedCompetitionApi.getFixture.mockResolvedValue([makeMatch({ id: 'm1' })]);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ query: useFixtureQuery(), invalidate: useInvalidateFixtureQuery() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(mockedCompetitionApi.getFixture).toHaveBeenCalledTimes(1);

    await result.current.invalidate();

    await waitFor(() => expect(mockedCompetitionApi.getFixture).toHaveBeenCalledTimes(2));
  });
});
