import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  predictionsApi,
  type ResetOverrideResponse,
  type SavePredictionInput,
  type SavePredictionResponse,
} from '@/platform/backend-api/predictions-api';
import { competitionApi } from '@/platform/backend-api/competition-api';
import { poolsApi } from '@/platform/backend-api/pools-api';
import { useFixtureQuery } from '@/shared/competition';
import type { Match } from '@/domain/competition';
import type { PoolPickerEntry } from '@/domain/pools';
import type { MatchWithMyPrediction, MyPrediction } from '@/domain/predictions';

/**
 * The knockout-phase-id lookup (design.md §6 note, competition-api.ts's
 * `getKnockoutPhaseIds`) — a small, mostly-static list, cached under its own
 * flat key so it doesn't get invalidated by prediction-save mutations.
 */
export const KNOCKOUT_PHASE_IDS_QUERY_KEY = ['competition', 'knockoutPhaseIds'] as const;

export function useKnockoutPhaseIdsQuery() {
  return useQuery<string[]>({
    queryKey: KNOCKOUT_PHASE_IDS_QUERY_KEY,
    queryFn: () => competitionApi.getKnockoutPhaseIds(),
  });
}

/**
 * The one flat TanStack Query key for "my predictions" (design.md §5,
 * §6 — ADR-019 precedent: one flat key, no per-match sub-keys). Every
 * consumer reads through this key so a save-mutation's invalidation
 * refreshes every mounted consumer at once.
 */
export const MY_PREDICTIONS_QUERY_KEY = ['predictions', 'mine'] as const;

export function useMyPredictionsQuery() {
  return useQuery<MyPrediction[]>({
    queryKey: MY_PREDICTIONS_QUERY_KEY,
    queryFn: () => predictionsApi.getMyPredictions(),
  });
}

export function useInvalidateMyPredictionsQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MY_PREDICTIONS_QUERY_KEY });
}

/**
 * Joins the flat fixture list (Bolt 5, `@/shared/competition`) with "my
 * predictions" (this bolt) into `MatchWithMyPrediction[]` — the client-side
 * equivalent of the backend's `getFixtureWithMyPredictions` (design.md §6).
 * `isKnockout` is derived from `phaseId` via `knockoutPhaseIds` (passed by
 * the caller, since phase metadata isn't part of `Match` itself — see
 * `predictions-screen.tsx` for where that set comes from).
 *
 * Two independent queries, joined at read time — never a combined cached
 * shape (ADR-019 discipline: derive at read time, don't cache a computed
 * join as if it were server state).
 */
export function useMatchesWithMyPredictions(knockoutPhaseIds: ReadonlySet<string>): {
  rows: MatchWithMyPrediction[] | undefined;
  isLoading: boolean;
  error: unknown;
} {
  const fixtureQuery = useFixtureQuery();
  const predictionsQuery = useMyPredictionsQuery();

  const isLoading = fixtureQuery.isLoading || predictionsQuery.isLoading;
  const error = fixtureQuery.error ?? predictionsQuery.error;

  if (!fixtureQuery.data || !predictionsQuery.data) {
    return { rows: undefined, isLoading, error };
  }

  const predictionsByMatchId = new Map<string, MyPrediction>();
  for (const prediction of predictionsQuery.data) {
    // Global predictions only (poolId === null) — this is the card's
    // default/no-pool-selected view. Pool-scoped overrides are joined
    // separately (Bolt 8, `usePoolOverridesByMatch`) and passed alongside
    // this row, not folded into `row.prediction` itself.
    if (prediction.poolId === null) {
      predictionsByMatchId.set(prediction.matchId, prediction);
    }
  }

  const rows: MatchWithMyPrediction[] = fixtureQuery.data.map((match: Match) => ({
    match,
    prediction: predictionsByMatchId.get(match.id) ?? null,
    isKnockout: knockoutPhaseIds.has(match.phaseId),
  }));

  return { rows, isLoading, error };
}

/**
 * Bolt 8 (PREDICTIONS-3, design.md §5) — every pool-scoped prediction the
 * viewer has, grouped by `matchId`, so `PredictionMatchCard` can pre-fill
 * an existing override's values when the user picks that pool. Derived at
 * read time from the same `useMyPredictionsQuery()` data
 * `useMatchesWithMyPredictions` already reads — no second query.
 */
export function usePoolOverridesByMatch(): Map<string, MyPrediction[]> {
  const predictionsQuery = useMyPredictionsQuery();
  const map = new Map<string, MyPrediction[]>();
  for (const prediction of predictionsQuery.data ?? []) {
    if (prediction.poolId === null) continue;
    const existing = map.get(prediction.matchId) ?? [];
    existing.push(prediction);
    map.set(prediction.matchId, existing);
  }
  return map;
}

/**
 * Bolt 8 (PREDICTIONS-3, design.md §1.3/§4) — the narrow "which pool to
 * override" picker read: a lean `{id, name}[]` list of the viewer's own
 * pool memberships, called directly through `poolsApi` (platform seam),
 * never through anything in `src/remotes/pools/` (ADR-036).
 */
export const POOLS_FOR_PICKER_QUERY_KEY = ['pools', 'forPicker'] as const;

export function usePoolsForPickerQuery() {
  return useQuery<PoolPickerEntry[]>({
    queryKey: POOLS_FOR_PICKER_QUERY_KEY,
    queryFn: () => poolsApi.getMyPoolsForPicker(),
  });
}

export function useSavePredictionMutation() {
  const invalidate = useInvalidateMyPredictionsQuery();
  const queryClient = useQueryClient();
  return useMutation<SavePredictionResponse, unknown, SavePredictionInput>({
    mutationFn: input => predictionsApi.savePrediction(input),
    onSuccess: (response, variables) => {
      if (response.ok) {
        invalidate();
        // Bolt 8 (design.md §6): a pool-scoped save also refreshes any
        // mounted `pools` remote member-prediction grid for that pool —
        // works today with zero new cross-bundle import because
        // `@tanstack/react-query` is an MF-shared singleton (ADR-034); the
        // host and the `pools` remote share the exact same `QueryClient`.
        if (variables.poolId) {
          queryClient.invalidateQueries({ queryKey: ['pools', 'memberPredictions'] });
        }
      }
    },
  });
}

/** Bolt 8 — PREDICTIONS-4 (design.md §5). */
export function useResetOverrideMutation() {
  const invalidate = useInvalidateMyPredictionsQuery();
  const queryClient = useQueryClient();
  return useMutation<ResetOverrideResponse, unknown, { matchId: string; poolId: string }>({
    mutationFn: input => predictionsApi.resetOverride(input),
    onSuccess: response => {
      if (response.ok) {
        invalidate();
        queryClient.invalidateQueries({ queryKey: ['pools', 'memberPredictions'] });
      }
    },
  });
}
