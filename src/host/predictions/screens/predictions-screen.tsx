import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompetitionStore, useLiveCompetitionSubscription } from '@/shared/competition';
import { PredictionsFixtureList } from '@/host/predictions/components/predictions-fixture-list';
import {
  useKnockoutPhaseIdsQuery,
  useMatchesWithMyPredictions,
  usePoolOverridesByMatch,
  usePoolsForPickerQuery,
  useResetOverrideMutation,
  useSavePredictionMutation,
} from '@/host/predictions/hooks/use-predictions-query';
import type { SavePredictionInput } from '@/platform/backend-api/predictions-api';
import { ErrorState, LoadingState } from '@/shared/design/primitives';

/**
 * PREDICTIONS-1/2/5's entry screen — the highest-traffic screen in the app
 * (host bundle, `requirements.md §7.4`). First real navigable mount of
 * Bolt 5's fixture data (`useFixtureQuery`/`useLiveCompetitionSubscription`,
 * consumed here via `useMatchesWithMyPredictions`) — see design.md §4.
 *
 * "Now" is captured once per render via `useState`'s lazy initializer +
 * re-derived below (not memoized across renders indefinitely) so
 * `getPredictionEligibility`'s lock evaluation stays reasonably fresh
 * without re-running on every keystroke inside a child `PredictionScoreInput`
 * (state is local to each `PredictionMatchCard`, so sibling re-renders don't
 * cascade from typing — see ADR-025/design.md §5).
 */
export function PredictionsScreen() {
  const { t } = useTranslation();
  const [now] = useState(() => new Date().toISOString());

  const knockoutPhaseIdsQuery = useKnockoutPhaseIdsQuery();
  const knockoutPhaseIds = useMemo(
    () => new Set(knockoutPhaseIdsQuery.data ?? []),
    [knockoutPhaseIdsQuery.data],
  );

  const { rows, isLoading, error } = useMatchesWithMyPredictions(knockoutPhaseIds);
  const showPastMatches = useCompetitionStore(state => state.showPastMatches);
  const togglePastMatches = useCompetitionStore(state => state.togglePastMatches);

  const matches = useMemo(() => rows?.map(r => r.match), [rows]);
  useLiveCompetitionSubscription(matches);

  const saveMutation = useSavePredictionMutation();
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const handleSave = useCallback(
    (input: SavePredictionInput) => {
      setSavingMatchId(input.matchId);
      saveMutation.mutate(input, {
        onSettled: () => setSavingMatchId(null),
      });
    },
    [saveMutation],
  );

  // Bolt 8 (PREDICTIONS-3/4, design.md §5) — the pool-override picker's
  // data and the reset-override mutation.
  const poolsForPickerQuery = usePoolsForPickerQuery();
  const pools = poolsForPickerQuery.data ?? [];
  const poolOverridesByMatch = usePoolOverridesByMatch();

  const resetMutation = useResetOverrideMutation();
  const [resettingKey, setResettingKey] = useState<string | null>(null);

  const handleResetOverride = useCallback(
    (input: { matchId: string; poolId: string }) => {
      setResettingKey(`${input.matchId}:${input.poolId}`);
      resetMutation.mutate(input, {
        onSettled: () => setResettingKey(null),
      });
    },
    [resetMutation],
  );

  if (error) {
    return <ErrorState label={t('predictions.error')} />;
  }

  if (isLoading || !rows) {
    return <LoadingState label={t('predictions.loading')} />;
  }

  return (
    <PredictionsFixtureList
      rows={rows}
      now={now}
      showPastMatches={showPastMatches}
      onTogglePastMatches={togglePastMatches}
      onSave={handleSave}
      savingMatchId={savingMatchId}
      pools={pools}
      poolOverridesByMatch={poolOverridesByMatch}
      onResetOverride={handleResetOverride}
      resettingKey={resettingKey}
    />
  );
}
