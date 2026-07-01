import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { predictionsApi, type SavePredictionInput, type SavePredictionResponse } from '@/platform/backend-api/predictions-api';
import { competitionApi } from '@/platform/backend-api/competition-api';
import { useFixtureQuery } from '@/shared/competition';
import type { Match } from '@/domain/competition';
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
    // Global predictions only (poolId === null) — pool-scoped overrides
    // (Bolt 8) are intentionally excluded from this bolt's join.
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

export function useSavePredictionMutation() {
  const invalidate = useInvalidateMyPredictionsQuery();
  return useMutation<SavePredictionResponse, unknown, SavePredictionInput>({
    mutationFn: input => predictionsApi.savePrediction(input),
    onSuccess: response => {
      if (response.ok) {
        invalidate();
      }
    },
  });
}
