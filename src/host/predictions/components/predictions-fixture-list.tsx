import { useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FixtureDaySectionHeader } from '@/shared/competition';
import { PredictionMatchCard } from '@/host/predictions/components/prediction-match-card';
import { buildFixtureView, type FixtureView } from '@/domain/competition';
import type { MatchWithMyPrediction } from '@/domain/predictions';
import type { SavePredictionInput } from '@/platform/backend-api/predictions-api';

type PredictionsFixtureListRow =
  | { kind: 'header'; calendarDate: string }
  | { kind: 'match'; row: MatchWithMyPrediction };

type PredictionsFixtureListProps = {
  rows: MatchWithMyPrediction[];
  now: string;
  showPastMatches: boolean;
  onTogglePastMatches: () => void;
  onSave: (input: SavePredictionInput) => void;
  savingMatchId: string | null;
};

/**
 * Predictions' own day-grouped, virtualized fixture list (ADR-025) — reuses
 * Bolt 5's `buildFixtureView` (domain) and `FixtureDaySectionHeader`
 * (presentational), but renders `PredictionMatchCard` instead of Bolt 5's
 * read-only `MatchCard`, and owns its own FlashList wiring rather than
 * extending `@/shared/competition`'s `FixtureList`. See ADR-025 for the
 * full rationale (this is a deliberate, small duplication of ~40 lines of
 * list-wiring code, not domain logic).
 *
 * Follows the exact same `vercel-react-native-skills` discipline
 * `FixtureList` established (ADR-022): memoized flattening, stabilized
 * `renderItem`/`keyExtractor`/`getItemType`, memoized row component.
 */
export function PredictionsFixtureList({
  rows,
  now,
  showPastMatches,
  onTogglePastMatches,
  onSave,
  savingMatchId,
}: PredictionsFixtureListProps) {
  const view: FixtureView = useMemo(
    () => buildFixtureView(rows.map(r => r.match), now),
    [rows, now],
  );

  const rowsByMatchId = useMemo(() => {
    const map = new Map<string, MatchWithMyPrediction>();
    for (const row of rows) map.set(row.match.id, row);
    return map;
  }, [rows]);

  const flattenedRows = useMemo<PredictionsFixtureListRow[]>(() => {
    const groups = showPastMatches ? [...view.past, ...view.currentAndUpcoming] : view.currentAndUpcoming;

    return groups.flatMap(group => [
      { kind: 'header' as const, calendarDate: group.calendarDate },
      ...group.matches.map(match => {
        const row = rowsByMatchId.get(match.id);
        // `row` is guaranteed present — `view` was built from `rows`' own
        // matches — but fall back defensively rather than crash if a future
        // change breaks that invariant.
        return { kind: 'match' as const, row: row ?? { match, prediction: null, isKnockout: false } };
      }),
    ]);
  }, [view, showPastMatches, rowsByMatchId]);

  const renderItem = useCallback<ListRenderItem<PredictionsFixtureListRow>>(
    ({ item }) => {
      if (item.kind === 'header') {
        return <FixtureDaySectionHeader calendarDate={item.calendarDate} />;
      }
      return (
        <PredictionMatchCard
          row={item.row}
          now={now}
          onSave={onSave}
          isSaving={savingMatchId === item.row.match.id}
        />
      );
    },
    [now, onSave, savingMatchId],
  );

  const keyExtractor = useCallback((item: PredictionsFixtureListRow, index: number) => {
    if (item.kind === 'header') return `header-${item.calendarDate}`;
    return `match-${item.row.match.id}-${index}`;
  }, []);

  const getItemType = useCallback((item: PredictionsFixtureListRow) => item.kind, []);

  const hasPastMatches = view.past.length > 0;

  return (
    <View style={styles.container}>
      {hasPastMatches ? (
        <Pressable accessibilityRole="button" onPress={onTogglePastMatches} style={styles.toggle}>
          <Text style={styles.toggleText}>{showPastMatches ? 'Hide past matches' : 'Show past matches'}</Text>
        </Pressable>
      ) : null}
      <FlashList
        data={flattenedRows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggle: {
    padding: 12,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
