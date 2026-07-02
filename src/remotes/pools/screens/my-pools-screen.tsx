import { useCallback } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useMyPoolsQuery } from '@/remotes/pools/hooks/use-pools-query';
import { PoolListItem } from '@/remotes/pools/components/pool-list-item';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { PoolSummary } from '@/domain/pools';

type Props = NativeStackScreenProps<PoolsStackParamList, 'MyPools'>;

/**
 * POOLS-1/POOLS-2/POOLS-5 — the pools remote's entry screen: pools the
 * viewer belongs to, plus navigation into create/discover/join-by-token
 * (design.md §3). `@shopify/flash-list` per ADR-034 — first remote-side
 * FlashList consumer, requires the shared-singleton MF config addition.
 */
export function MyPoolsScreen({ navigation }: Props) {
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
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>Couldn't load your pools.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button title="Create a pool" onPress={handleCreate} />
        <Button title="Discover public pools" onPress={handleDiscover} />
        <Button title="Join by code" onPress={handleJoinByToken} />
      </View>
      {pools && pools.length > 0 ? (
        <FlashList data={pools} renderItem={renderItem} keyExtractor={keyExtractor} />
      ) : (
        <View style={styles.centered}>
          <Text>You haven't joined any pools yet.</Text>
        </View>
      )}
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
    padding: 16,
  },
  actions: {
    padding: 16,
    gap: 8,
  },
});
