import { useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import {
  usePoolDetailQuery,
  useKickMemberMutation,
  useLeavePoolMutation,
  useSetArchivedMutation,
} from '@/remotes/pools/hooks/use-pools-query';
import { PoolMemberRow } from '@/remotes/pools/components/pool-member-row';
import { InviteTokenPanel } from '@/remotes/pools/components/invite-token-panel';
import { canDelete, canKick, canLeave } from '@/domain/pools';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { PoolMember } from '@/domain/pools';

type Props = NativeStackScreenProps<PoolsStackParamList, 'PoolDetail'>;

/**
 * POOLS-2/POOLS-4/POOLS-5 — a pool's detail: member list, invite panel
 * (owner/permission-gated), leave/archive affordances, and an entry point
 * into owner-only settings. Every membership action here is allowed at any
 * time — no competition-state read anywhere in this screen or the
 * mutations it calls (ADR-033).
 */
export function PoolDetailScreen({ route, navigation }: Props) {
  const { poolId } = route.params;
  const { data: detail, isLoading, error } = usePoolDetailQuery(poolId);
  const kickMutation = useKickMemberMutation();
  const leaveMutation = useLeavePoolMutation();
  const archiveMutation = useSetArchivedMutation();

  const handleKick = useCallback(
    (targetUserId: string) => {
      kickMutation.mutate({ poolId, targetUserId });
    },
    [kickMutation, poolId],
  );

  const handleLeave = useCallback(() => {
    leaveMutation.mutate(poolId);
  }, [leaveMutation, poolId]);

  const handleArchiveToggle = useCallback(
    (archived: boolean) => {
      archiveMutation.mutate({ poolId, archived });
    },
    [archiveMutation, poolId],
  );

  const handleOpenSettings = useCallback(() => {
    navigation.navigate('PoolSettings', { poolId });
  }, [navigation, poolId]);

  const viewerId = detail?.ok ? detail.viewerMembership?.userId ?? null : null;
  const isViewerOwner = detail?.ok ? detail.pool.ownerId === viewerId : false;
  const isArchived = detail?.ok ? (detail.viewerMembership?.archivedAt ?? null) !== null : false;

  const renderItem = useCallback<ListRenderItem<PoolMember>>(
    ({ item }) => {
      if (!detail?.ok || !viewerId) {
        return <PoolMemberRow member={item} canKick={false} onKick={handleKick} />;
      }
      const kickAllowed = canKick(detail.pool, viewerId, item.userId);
      return <PoolMemberRow member={item} canKick={kickAllowed} onKick={handleKick} />;
    },
    [detail, viewerId, handleKick],
  );

  const keyExtractor = useCallback((item: PoolMember) => item.userId, []);

  const members = useMemo(() => (detail?.ok ? detail.members : []), [detail]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !detail || !detail.ok) {
    return (
      <View style={styles.centered}>
        <Text>Pool not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{detail.pool.name}</Text>
      <Text style={styles.meta}>
        {detail.pool.type === 'PUBLIC' ? 'Public' : 'Private'} · {detail.pool.memberCount}/{detail.pool.capacity} members
      </Text>

      {viewerId ? (
        <InviteTokenPanel
          pool={detail.pool}
          inviteToken={detail.pool.inviteToken}
          viewerIsOwner={isViewerOwner}
        />
      ) : null}

      <FlashList data={members} renderItem={renderItem} keyExtractor={keyExtractor} />

      <View style={styles.actions}>
        {isViewerOwner && canDelete(detail.pool, viewerId ?? '') ? (
          <Button title="Pool settings" onPress={handleOpenSettings} />
        ) : null}
        {viewerId && canLeave(detail.pool, viewerId) ? (
          <Button title="Leave pool" color="#cc3333" onPress={handleLeave} />
        ) : null}
        {viewerId ? (
          <Button
            title={isArchived ? 'Unarchive' : 'Archive'}
            onPress={() => handleArchiveToggle(!isArchived)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  actions: {
    gap: 8,
    marginTop: 12,
  },
});
