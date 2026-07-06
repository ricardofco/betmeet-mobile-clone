import { useCallback } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { YStack } from 'tamagui';
import { useMyPoolsQuery } from '@/remotes/pools/hooks/use-pools-query';
import { PoolListItem } from '@/remotes/pools/components/pool-list-item';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { PoolSummary } from '@/domain/pools';
import { Card, EmptyState, ErrorState, LoadingState, PrimaryButton } from '@/shared/design/primitives';

type Props = NativeStackScreenProps<PoolsStackParamList, 'MyPools'>;

/**
 * POOLS-1/POOLS-2/POOLS-5 — the pools remote's entry screen: pools the
 * viewer belongs to, plus navigation into create/discover/join-by-token
 * (design.md §3). `@shopify/flash-list` per ADR-034 — first remote-side
 * FlashList consumer, requires the shared-singleton MF config addition.
 *
 * Bolt 9 (ADR-043): the chrome (action buttons, loading/empty/error states)
 * is retrofitted with `i18next` + Tamagui primitives — the first real
 * cross-bundle usage of both, proving the MF shared-singleton wiring for
 * real, not just planned. `PoolListItem`'s own row rendering was originally
 * left as plain `StyleSheet` per `implement-and-test.md §5`'s list-perf
 * rationale, then revisited post-Implement (Layer 2 finding #4) as a
 * deliberate, narrow exception — see that component's own header comment
 * for why this particular (small-cardinality) list differs from
 * Predictions' large fixture grid.
 */
export function MyPoolsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: pools, isLoading, error } = useMyPoolsQuery();

  const handlePressPool = useCallback(
    (poolId: string) => {
      navigation.navigate('PoolDetail', { poolId });
    },
    [navigation],
  );

  const handleCreate = useCallback(() => navigation.navigate('CreatePool'), [navigation]);
  const handleDiscover = useCallback(() => navigation.navigate('DiscoverPools'), [navigation]);
  const handleJoinByToken = useCallback(() => navigation.navigate('JoinByToken'), [navigation]);

  const renderItem = useCallback<ListRenderItem<PoolSummary>>(
    ({ item }) => (
      <PoolListItem pool={item} viewerMembership={item.viewerMembership} onPress={handlePressPool} />
    ),
    [handlePressPool],
  );

  const keyExtractor = useCallback((item: PoolSummary) => item.id, []);

  if (isLoading) {
    return <LoadingState label={t('pools.myPools.loading')} />;
  }

  if (error) {
    return <ErrorState label={t('pools.myPools.error')} />;
  }

  return (
    <YStack flex={1} gap="$3">
      {/* Post-Implement fix (2026-07-06, Layer 2 finding #4): the 3 action
          buttons used to sit in a cramped `flexWrap` row; stacked vertically
          inside a `Card` (full-width buttons, `alignSelf="stretch"`) reads
          much better with the longer Spanish labels ("Descubrir ligas
          públicas", "Unirse con código") than an awkward multi-line wrap. */}
      <Card margin="$4" marginBottom="$0" gap="$3">
        <PrimaryButton alignSelf="stretch" onPress={handleCreate}>
          {t('pools.myPools.create')}
        </PrimaryButton>
        <PrimaryButton alignSelf="stretch" onPress={handleDiscover}>
          {t('pools.myPools.discover')}
        </PrimaryButton>
        <PrimaryButton alignSelf="stretch" onPress={handleJoinByToken}>
          {t('pools.myPools.joinByToken')}
        </PrimaryButton>
      </Card>
      {pools && pools.length > 0 ? (
        <FlashList data={pools} renderItem={renderItem} keyExtractor={keyExtractor} />
      ) : (
        <EmptyState label={t('pools.myPools.empty')} />
      )}
    </YStack>
  );
}
