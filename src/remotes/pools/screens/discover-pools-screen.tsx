import { useCallback, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePublicPoolsQuery, useJoinPublicMutation } from '@/remotes/pools/hooks/use-pools-query';
import { PoolListItem } from '@/remotes/pools/components/pool-list-item';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { Pool } from '@/domain/pools';

type Props = NativeStackScreenProps<PoolsStackParamList, 'DiscoverPools'>;

/**
 * POOLS-2 — browse PUBLIC pools, join directly (`joinPublicPool`,
 * design.md §3). Joining is allowed at any time (ADR-033 — no tournament
 * freeze gate here or on the backend handler this calls).
 */
export function DiscoverPoolsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: pools, isLoading, error } = usePublicPoolsQuery();
  const joinMutation = useJoinPublicMutation();
  const [joinError, setJoinError] = useState<string | null>(null);

  const handlePressPool = useCallback(
    async (poolId: string) => {
      setJoinError(null);
      const result = await joinMutation.mutateAsync(poolId);
      if (result.ok) {
        navigation.navigate('PoolDetail', { poolId: result.poolId });
      } else if (result.error === 'FULL') {
        setJoinError(t('pools.discoverPools.joinFullError'));
      } else {
        setJoinError(t('pools.discoverPools.joinGenericError'));
      }
    },
    [joinMutation, navigation, t],
  );

  const renderItem = useCallback<ListRenderItem<Pool>>(
    ({ item }) => <PoolListItem pool={item} onPress={handlePressPool} />,
    [handlePressPool],
  );

  const keyExtractor = useCallback((item: Pool) => item.id, []);

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
        <Text>{t('pools.discoverPools.loadError')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
      {pools && pools.length > 0 ? (
        <FlashList data={pools} renderItem={renderItem} keyExtractor={keyExtractor} />
      ) : (
        <View style={styles.centered}>
          <Text>{t('pools.discoverPools.empty')}</Text>
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
  error: {
    color: '#cc3333',
    padding: 12,
    textAlign: 'center',
  },
});
