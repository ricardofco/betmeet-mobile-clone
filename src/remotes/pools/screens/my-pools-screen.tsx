import { useCallback } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { CirclePlus, Compass, KeyRound } from 'lucide-react-native';
import { useTheme, XStack, YStack } from 'tamagui';
import { useMyPoolsQuery } from '@/remotes/pools/hooks/use-pools-query';
import { PoolListItem } from '@/remotes/pools/components/pool-list-item';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { PoolSummary } from '@/domain/pools';
import { ActionCard, ActionCardLabel, EmptyState, ErrorState, LoadingState } from '@/shared/design/primitives';

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
  const theme = useTheme();
  // `lucide-react-native` icons are plain `react-native-svg` components, not
  // Tamagui-themed ones — they need a resolved color string, not a `$token`
  // reference (unlike `ActionCard`/`ActionCardLabel` below, which resolve
  // tokens themselves). `useTheme()` is the standard Tamagui seam for this.
  const iconColor = theme.primary?.val ?? '#2e7d32';
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
      {/* Change-2026-07-08 (item 4) — redesigned from 3 stacked full-width
          green `PrimaryButton`s into a row of equal-weight, icon-labeled
          `ActionCard`s (Tamagui-first, themed tokens only — design-standards
          instruction). Post-Implement fix (2026-07-06, Layer 2 finding #4)'s
          vertical-stack layout is superseded by this redesign; `PoolListItem`
          below is explicitly untouched — the user's complaint was scoped to
          these 3 top actions only, not the pool list rows. */}
      <XStack margin="$4" marginBottom="$0" gap="$3">
        <ActionCard accessibilityRole="button" onPress={handleCreate}>
          <CirclePlus color={iconColor} size={28} />
          <ActionCardLabel>{t('pools.myPools.create')}</ActionCardLabel>
        </ActionCard>
        <ActionCard accessibilityRole="button" onPress={handleDiscover}>
          <Compass color={iconColor} size={28} />
          <ActionCardLabel>{t('pools.myPools.discover')}</ActionCardLabel>
        </ActionCard>
        <ActionCard accessibilityRole="button" onPress={handleJoinByToken}>
          <KeyRound color={iconColor} size={28} />
          <ActionCardLabel>{t('pools.myPools.joinByToken')}</ActionCardLabel>
        </ActionCard>
      </XStack>
      {pools && pools.length > 0 ? (
        <FlashList data={pools} renderItem={renderItem} keyExtractor={keyExtractor} />
      ) : (
        <EmptyState label={t('pools.myPools.empty')} />
      )}
    </YStack>
  );
}
