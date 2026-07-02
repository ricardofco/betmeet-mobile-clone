import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
 */
function PoolListItemComponent({ pool, viewerMembership, onPress }: PoolListItemProps) {
  const handlePress = () => onPress(pool.id);
  const isArchived = viewerMembership?.archivedAt != null;

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={styles.row}>
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {pool.name}
        </Text>
        <Text style={styles.meta}>
          {pool.type === 'PUBLIC' ? 'Public' : 'Private'} · {pool.memberCount}/{pool.capacity} members
        </Text>
      </View>
      {isArchived ? <Text style={styles.archivedBadge}>Archived</Text> : null}
    </Pressable>
  );
}

export const PoolListItem = memo(PoolListItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  textColumn: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  archivedBadge: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
});
