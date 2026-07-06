import { useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { XStack } from 'tamagui';
import { usePoolLeaderboardQuery } from '@/remotes/pools/hooks/use-pool-leaderboard-query';
import { PoolLeaderboardRow } from '@/remotes/pools/components/pool-leaderboard-row';
import { BodyText, EmptyState, ErrorState, LoadingState } from '@/shared/design/primitives';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { ProjectedRow, RankedRow } from '@/domain/rankings';

type Props = NativeStackScreenProps<PoolsStackParamList, 'PoolLeaderboard'>;

type LeaderboardListRow = RankedRow | ProjectedRow;

/**
 * RANKINGS-2 — the pool leaderboard, reached from `PoolDetailScreen`
 * (design.md §7.2). Tamagui-first chrome (loading/error/empty/live-banner,
 * `src/shared/design/primitives.tsx`) wrapping a plain `StyleSheet` FlashList
 * row (`pool-leaderboard-row.tsx`'s own doc comment). Calls `rankingsApi`
 * directly (via `usePoolLeaderboardQuery`) — no import from
 * `src/host/rankings/` (ADR-036/037).
 *
 * Renders `data.projected` while live, `data.confirmed` otherwise — the
 * exact same `buildRankedView` the host's `RankingsScreen` also calls
 * (design.md §7.2 — same function reference, not a re-implementation).
 */
export function PoolLeaderboardScreen({ route }: Props) {
  const { t } = useTranslation();
  const { poolId } = route.params;
  const { data, isLoading, error, refetch } = usePoolLeaderboardQuery(poolId);

  if (isLoading) {
    return <LoadingState label={t('pools.leaderboardScreen.loading')} />;
  }

  if (error || !data) {
    return <ErrorState label={t('pools.leaderboardScreen.error')} onRetry={refetch} retryLabel={t('common.retry')} />;
  }

  if (!data.ok) {
    const label =
      data.error === 'NOT_MEMBER' ? t('pools.leaderboardScreen.notMember') : t('pools.leaderboardScreen.error');
    return <ErrorState label={label} />;
  }

  return <PoolLeaderboardContent data={data} />;
}

function PoolLeaderboardContent({
  data,
}: {
  data: { ok: true; confirmed: RankedRow[]; projected: ProjectedRow[] | null; isLive: boolean };
}) {
  const { t } = useTranslation();
  const isLive = data.isLive;

  const rows: LeaderboardListRow[] = useMemo(
    () => (isLive && data.projected ? data.projected : data.confirmed),
    [isLive, data.projected, data.confirmed],
  );

  const renderItem = useCallback<ListRenderItem<LeaderboardListRow>>(
    ({ item }) => (
      <PoolLeaderboardRow row={item} isLive={isLive} fallbackNicknameLabel={t('rankings.anonymousPlayer')} />
    ),
    [isLive, t],
  );

  const keyExtractor = useCallback((item: LeaderboardListRow) => item.userId, []);

  return (
    <View style={styles.container}>
      {isLive ? (
        <XStack margin="$4" marginBottom="$2" alignSelf="flex-start" backgroundColor="$primary" borderRadius="$3" paddingHorizontal="$2" paddingVertical="$1">
          <BodyText fontSize="$1" fontWeight="700" color="$primaryContrast">
            {t('rankings.live')}
          </BodyText>
        </XStack>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState label={t('pools.leaderboardScreen.empty')} />
      ) : (
        <View style={styles.listContainer}>
          <FlashList data={rows} renderItem={renderItem} keyExtractor={keyExtractor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
});
