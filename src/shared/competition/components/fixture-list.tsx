import { useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MatchCard } from '@/shared/competition/components/match-card';
import { FixtureDaySectionHeader } from '@/shared/competition/components/fixture-day-section';
import type { FixtureView, Match } from '@/domain/competition';

type FixtureListRow =
  | { kind: 'header'; calendarDate: string }
  | { kind: 'match'; match: Match };

type FixtureListProps = {
  view: FixtureView;
  showPastMatches: boolean;
  onTogglePastMatches: () => void;
};

/**
 * Renders `FixtureView` as a flat, day-grouped, virtualized list
 * (COMPETITION-1 AC: grouped fixture screen). First `@shopify/flash-list`
 * consumer in the repo (ADR-022) — FlashList v2's API is a flat list with
 * `getItemType`-based recycling rather than a dedicated section-list
 * component, so day groups are flattened into header + match rows here, one
 * `getItemType` per row kind so FlashList recycles header views separately
 * from match-card views.
 *
 * Per `vercel-react-native-skills`: no inline function/object literals are
 * created per row — `renderItem`/`keyExtractor`/`getItemType` are all
 * `useCallback`-stabilized, and the flattened `rows` array is memoized so a
 * re-render that doesn't change `view`/`showPastMatches` doesn't reflatten.
 */
export function FixtureList({ view, showPastMatches, onTogglePastMatches }: FixtureListProps) {
  const rows = useMemo<FixtureListRow[]>(() => {
    const groups = showPastMatches
      ? [...view.past, ...view.currentAndUpcoming]
      : view.currentAndUpcoming;

    return groups.flatMap(group => [
      { kind: 'header' as const, calendarDate: group.calendarDate },
      ...group.matches.map(match => ({ kind: 'match' as const, match })),
    ]);
  }, [view, showPastMatches]);

  const renderItem = useCallback<ListRenderItem<FixtureListRow>>(({ item }) => {
    if (item.kind === 'header') {
      return <FixtureDaySectionHeader calendarDate={item.calendarDate} />;
    }
    return <MatchCard match={item.match} />;
  }, []);

  const keyExtractor = useCallback((item: FixtureListRow, index: number) => {
    if (item.kind === 'header') return `header-${item.calendarDate}`;
    return `match-${item.match.id}-${index}`;
  }, []);

  const getItemType = useCallback((item: FixtureListRow) => item.kind, []);

  const hasPastMatches = view.past.length > 0;

  return (
    <View style={styles.container}>
      {hasPastMatches ? (
        <Pressable
          accessibilityRole="button"
          onPress={onTogglePastMatches}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {showPastMatches ? 'Hide past matches' : 'Show past matches'}
          </Text>
        </Pressable>
      ) : null}
      <FlashList
        data={rows}
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
