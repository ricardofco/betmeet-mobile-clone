import { useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { XStack } from 'tamagui';
import { useGlobalRankingQuery } from '@/host/rankings/hooks/use-global-ranking-query';
import { RankingRowItem } from '@/host/rankings/components/ranking-row';
import { BodyText, EmptyState, ErrorState, Heading, LoadingState, Screen } from '@/shared/design/primitives';
import type { ProjectedRow, RankedRow } from '@/domain/rankings';

type RankingListRow = RankedRow | ProjectedRow;

/**
 * RANKINGS-1's entry screen (design.md §7.1) — the 4th top-level tab
 * (`ADR-048`). Tamagui-first chrome (header + loading/error/empty states,
 * `src/shared/design/primitives.tsx`, zero new tokens) wrapping a plain
 * `StyleSheet` FlashList row (`ranking-row.tsx`'s own doc comment).
 *
 * Renders `data.projected` while live (`isLive`), `data.confirmed`
 * otherwise — both computed once, mobile-side, via the same
 * `buildRankedView` the `pools` remote's leaderboard hook also calls
 * (design.md §7.2 — same function reference, not a re-implementation).
 */
export function RankingsScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGlobalRankingQuery();

  const isLive = data?.isLive ?? false;

  const rows: RankingListRow[] = useMemo(() => {
    if (!data) return [];
    return isLive && data.projected ? data.projected : data.confirmed;
  }, [data, isLive]);

  const renderItem = useCallback<ListRenderItem<RankingListRow>>(
    ({ item }) => (
      <RankingRowItem row={item} isLive={isLive} fallbackNicknameLabel={t('rankings.anonymousPlayer')} />
    ),
    [isLive, t],
  );

  const keyExtractor = useCallback((item: RankingListRow) => item.userId, []);

  if (isLoading) {
    return <LoadingState label={t('rankings.loading')} />;
  }

  if (error) {
    return <ErrorState label={t('rankings.error')} onRetry={refetch} retryLabel={t('common.retry')} />;
  }

  return (
    <Screen padding="$0" gap="$0">
      <XStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$2" alignItems="center" justifyContent="space-between">
        <Heading>{t('rankings.title')}</Heading>
        {isLive ? (
          <XStack backgroundColor="$primary" borderRadius="$3" paddingHorizontal="$2" paddingVertical="$1">
            <BodyText fontSize="$1" fontWeight="700" color="$primaryContrast">
              {t('rankings.live')}
            </BodyText>
          </XStack>
        ) : null}
      </XStack>

      {rows.length === 0 ? (
        <EmptyState label={t('rankings.empty')} />
      ) : (
        <View style={styles.listContainer}>
          <FlashList data={rows} renderItem={renderItem} keyExtractor={keyExtractor} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
});
