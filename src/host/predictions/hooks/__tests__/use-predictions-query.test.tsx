import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import {
  useMyPredictionsQuery,
  useMatchesWithMyPredictions,
  useSavePredictionMutation,
  useKnockoutPhaseIdsQuery,
} from '@/host/predictions/hooks/use-predictions-query';
import { predictionsApi } from '@/platform/backend-api/predictions-api';
import { competitionApi } from '@/platform/backend-api/competition-api';
import type { Match } from '@/domain/competition';
import type { MyPrediction } from '@/domain/predictions';

jest.mock('@/platform/backend-api/predictions-api');
jest.mock('@/platform/backend-api/competition-api');

const mockedPredictionsApi = predictionsApi as jest.Mocked<typeof predictionsApi>;
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

function makePrediction(overrides: Partial<MyPrediction> & { id: string; matchId: string }): MyPrediction {
  return {
    poolId: null,
    homeScore: 1,
    awayScore: 0,
    penaltyWinner: null,
    pointsStatus: 'NOT_SCORED',
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

describe('useMyPredictionsQuery / useKnockoutPhaseIdsQuery (design.md §5, §6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches my predictions via predictionsApi.getMyPredictions', async () => {
    const predictions = [makePrediction({ id: 'p1', matchId: 'm1' })];
    mockedPredictionsApi.getMyPredictions.mockResolvedValue(predictions);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useMyPredictionsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(predictions));
  });

  it('fetches knockout phase ids via competitionApi.getKnockoutPhaseIds', async () => {
    mockedCompetitionApi.getKnockoutPhaseIds.mockResolvedValue(['ko-round-16']);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useKnockoutPhaseIdsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(['ko-round-16']));
  });
});

describe('useMatchesWithMyPredictions (client-side join, design.md §6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('joins fixture matches with the viewer\'s own global prediction by matchId', async () => {
    mockedCompetitionApi.getFixture.mockResolvedValue([
      makeMatch({ id: 'm1' }),
      makeMatch({ id: 'm2' }),
    ]);
    mockedPredictionsApi.getMyPredictions.mockResolvedValue([
      makePrediction({ id: 'p1', matchId: 'm1', homeScore: 2, awayScore: 2 }),
    ]);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useMatchesWithMyPredictions(new Set(['group-stage'])), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.rows).toBeDefined());
    const rows = result.current.rows!;
    expect(rows).toHaveLength(2);
    expect(rows.find(r => r.match.id === 'm1')?.prediction?.id).toBe('p1');
    expect(rows.find(r => r.match.id === 'm2')?.prediction).toBeNull();
    // 'group-stage' is in the knockout set passed in this test — verifies isKnockout derivation.
    expect(rows.every(r => r.isKnockout)).toBe(true);
  });

  it('excludes pool-scoped predictions (poolId non-null) from the global join (Bolt 8 concern)', async () => {
    mockedCompetitionApi.getFixture.mockResolvedValue([makeMatch({ id: 'm1' })]);
    mockedPredictionsApi.getMyPredictions.mockResolvedValue([
      makePrediction({ id: 'p1', matchId: 'm1', poolId: 'pool-1' }),
    ]);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useMatchesWithMyPredictions(new Set()), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.rows).toBeDefined());
    expect(result.current.rows![0].prediction).toBeNull();
  });
});

describe('useSavePredictionMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates the my-predictions query on a successful save', async () => {
    mockedPredictionsApi.getMyPredictions.mockResolvedValue([]);
    mockedPredictionsApi.savePrediction.mockResolvedValue({
      ok: true,
      prediction: { id: 'p1', matchId: 'm1', poolId: null, homeScore: 1, awayScore: 0, penaltyWinner: null, pointsStatus: 'NOT_SCORED' },
    });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ query: useMyPredictionsQuery(), mutation: useSavePredictionMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual([]));
    expect(mockedPredictionsApi.getMyPredictions).toHaveBeenCalledTimes(1);

    result.current.mutation.mutate({
      matchId: 'm1',
      poolId: null,
      homeScore: 1,
      awayScore: 0,
      penaltyWinner: null,
    });

    await waitFor(() => expect(mockedPredictionsApi.getMyPredictions).toHaveBeenCalledTimes(2));
  });

  it('does not invalidate on a LOCKED save-rejection response (server is the final authority, ADR-023)', async () => {
    mockedPredictionsApi.getMyPredictions.mockResolvedValue([]);
    mockedPredictionsApi.savePrediction.mockResolvedValue({ ok: false, error: 'LOCKED' });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ query: useMyPredictionsQuery(), mutation: useSavePredictionMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual([]));

    result.current.mutation.mutate({
      matchId: 'm1',
      poolId: null,
      homeScore: 1,
      awayScore: 0,
      penaltyWinner: null,
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(mockedPredictionsApi.getMyPredictions).toHaveBeenCalledTimes(1);
  });
});
