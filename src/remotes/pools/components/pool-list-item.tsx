import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, XStack, YStack } from 'tamagui';
import type { Pool, PoolMembership } from '@/domain/pools';

type PoolListItemProps = {
  pool: Pool;
  viewerMembership?: PoolMembership | null;
  onPress: (poolId: string) => void;
};

/**
 * One row in `my-pools-screen.tsx`/`discover-pools-screen.tsx`'s FlashList
 * (design.md §8 — `vercel-react-native-skills` list-item memoization rule,
 * same discipline as Bolt 5's `TeamBadge`/`MatchCard`).
 *
 * Post-Implement fixes (2026-07-06, Layer 2 findings #3/#4):
 * - #3: `pool.type`/member-count text and the "Archived" badge were fully
 *   hardcoded English, missed during Bolt 9's Implement stage. Now sourced
 *   from the same `pools.detail.typePublic`/`typePrivate`/`memberCount`
 *   keys `pool-detail-screen.tsx` already correctly uses (not new,
 *   redundant keys) plus one new `archivedBadge` key.
 * - #4: switched from plain `StyleSheet` to Tamagui primitives for real
 *   visual polish, per the design pass this bolt was supposed to deliver.
 *   This is a deliberate, narrow exception to `implement-and-test.md §5`'s
 *   "FlashList rows stay `StyleSheet`" rule — that rule's rationale
 *   (avoiding Tamagui's runtime style-resolution cost per row) applies most
 *   to *large* lists (Predictions' ~104-match fixture grid); the pools list
 *   this row renders in is typically small (a handful of pools per viewer),
 *   so the same performance concern doesn't hold here. The Predictions
 *   fixture list itself is unaffected — still plain `StyleSheet`, unchanged.
 */
function PoolListItemComponent({ pool, viewerMembership, onPress }: PoolListItemProps) {
  const { t } = useTranslation();
  const handlePress = () => onPress(pool.id);
  const isArchived = viewerMembership?.archivedAt != null;

  return (
    <XStack
      accessible
      accessibilityRole="button"
      onPress={handlePress}
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
      paddingHorizontal="$4"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <YStack flex={1} gap="$1">
        <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
          {pool.name}
        </Text>
        <Text fontSize="$2" color="$colorMuted">
          {pool.type === 'PUBLIC' ? t('pools.detail.typePublic') : t('pools.detail.typePrivate')} ·{' '}
          {t('pools.detail.memberCount', { count: pool.memberCount, capacity: pool.capacity })}
        </Text>
      </YStack>
      {isArchived ? (
        <Text fontSize="$1" color="$colorMuted" marginLeft="$2">
          {t('pools.detail.archivedBadge')}
        </Text>
      ) : null}
    </XStack>
  );
}

export const PoolListItem = memo(PoolListItemComponent);
