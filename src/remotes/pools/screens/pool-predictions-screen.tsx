import { useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FixtureDaySectionHeader } from '@/shared/competition';
import { PredictionGridMatchCard } from '@/remotes/pools/components/prediction-grid-match-card';
import { usePoolDetailQuery } from '@/remotes/pools/hooks/use-pools-query';
import {
  usePoolMemberPredictionsQuery,
  useResetGridOverrideMutation,
  useSaveGridPredictionMutation,
} from '@/remotes/pools/hooks/use-pool-predictions-query';
import type { PoolMatchSummary, PoolMemberPredictionCell } from '@/platform/backend-api/pools-api';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';

type Props = NativeStackScreenProps<PoolsStackParamList, 'PoolPredictions'>;

type GridRow =
  | { kind: 'header'; calendarDate: string }
  | { kind: 'match'; match: PoolMatchSummary };

function toLocalCalendarDate(isoInstant: string): string {
  const date = new Date(isoInstant);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * POOLS-6 — the pool's day-grouped member-prediction grid, with anti-bias
 * masking (model.md §5, design.md §4/§10, ADR-038). Calls
 * `pools.getMemberPredictions`/`predictions.save`/`predictions.resetOverride`
 * directly through the platform seam — no import from `src/host/
 * predictions/` (ADR-036/ADR-037).
 *
 * Day-grouping here is a small, local calendar-date bucketing (not a reuse
 * of `src/domain/competition`'s `groupMatchesByDay`, whose `Match` type
 * doesn't structurally match this screen's leaner `PoolMatchSummary` DTO —
 * a deliberate, low-risk implementation simplification, not a scope cut).
 */
export function PoolPredictionsScreen({ route }: Props) {
  const { t } = useTranslation();
  const { poolId } = route.params;
  const [now] = useState(() => new Date().toISOString());

  const detailQuery = usePoolDetailQuery(poolId);
  const predictionsQuery = usePoolMemberPredictionsQuery(poolId);

  const saveMutation = useSaveGridPredictionMutation(poolId);
  const resetMutation = useResetGridOverrideMutation(poolId);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleSaveViewerPrediction = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      setPendingKey(`save:${matchId}`);
      saveMutation.mutate(
        { matchId, poolId, homeScore, awayScore, penaltyWinner: null },
        { onSettled: () => setPendingKey(null) },
      );
    },
    [saveMutation, poolId],
  );

  const handleResetViewerOverride = useCallback(
    (matchId: string) => {
      setPendingKey(`reset:${matchId}`);
      resetMutation.mutate({ matchId, poolId }, { onSettled: () => setPendingKey(null) });
    },
    [resetMutation, poolId],
  );

  const cellsByMatch = useMemo(() => {
    const map = new Map<string, Map<string, PoolMemberPredictionCell>>();
    if (!predictionsQuery.data?.ok) return map;
    for (const cell of predictionsQuery.data.predictions) {
      let byUser = map.get(cell.matchId);
      if (!byUser) {
        byUser = new Map();
        map.set(cell.matchId, byUser);
      }
      byUser.set(cell.userId, cell);
    }
    return map;
  }, [predictionsQuery.data]);

  const rows = useMemo<GridRow[]>(() => {
    if (!predictionsQuery.data?.ok) return [];
    const byDay = new Map<string, PoolMatchSummary[]>();
    for (const match of predictionsQuery.data.matches) {
      const key = match.kickoffAt ? toLocalCalendarDate(match.kickoffAt) : 'unscheduled';
      const bucket = byDay.get(key) ?? [];
      bucket.push(match);
      byDay.set(key, bucket);
    }
    const sortedKeys = [...byDay.keys()].sort((a, b) => {
      if (a === 'unscheduled') return 1;
      if (b === 'unscheduled') return -1;
      return a.localeCompare(b);
    });

    const result: GridRow[] = [];
    for (const key of sortedKeys) {
      result.push({ kind: 'header', calendarDate: key });
      for (const match of byDay.get(key)!) {
        result.push({ kind: 'match', match });
      }
    }
    return result;
  }, [predictionsQuery.data]);

  const members = useMemo(() => (detailQuery.data?.ok ? detailQuery.data.members : []), [detailQuery.data]);
  const viewerId = detailQuery.data?.ok ? (detailQuery.data.viewerMembership?.userId ?? '') : '';

  const renderItem = useCallback<ListRenderItem<GridRow>>(
    ({ item }) => {
      if (item.kind === 'header') {
        return <FixtureDaySectionHeader calendarDate={item.calendarDate} />;
      }
      const isSavingThis = pendingKey === `save:${item.match.matchId}`;
      const isResettingThis = pendingKey === `reset:${item.match.matchId}`;
      return (
        <PredictionGridMatchCard
          match={item.match}
          members={members}
          cellsForMatch={cellsByMatch.get(item.match.matchId) ?? new Map()}
          viewerId={viewerId}
          now={now}
          onSaveViewerPrediction={handleSaveViewerPrediction}
          onResetViewerOverride={handleResetViewerOverride}
          isSavingViewer={isSavingThis}
          isResettingViewer={isResettingThis}
        />
      );
    },
    [members, cellsByMatch, viewerId, now, handleSaveViewerPrediction, handleResetViewerOverride, pendingKey],
  );

  const keyExtractor = useCallback((item: GridRow, index: number) => {
    if (item.kind === 'header') return `header-${item.calendarDate}`;
    return `match-${item.match.matchId}-${index}`;
  }, []);

  const getItemType = useCallback((item: GridRow) => item.kind, []);

  if (detailQuery.isLoading || predictionsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (predictionsQuery.data && !predictionsQuery.data.ok) {
    return (
      <View style={styles.centered}>
        <Text>{t('pools.poolPredictions.loadError')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList data={rows} renderItem={renderItem} keyExtractor={keyExtractor} getItemType={getItemType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
