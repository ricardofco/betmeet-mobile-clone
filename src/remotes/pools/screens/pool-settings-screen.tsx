import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  usePoolDetailQuery,
  useRenamePoolMutation,
  useUpdateVisibilityMutation,
  useUpdateMembersCanInviteMutation,
  useDeletePoolMutation,
} from '@/remotes/pools/hooks/use-pools-query';
import { TransferOwnershipPanel } from '@/remotes/pools/components/transfer-ownership-panel';
import { validatePoolName } from '@/domain/pools';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';

type Props = NativeStackScreenProps<PoolsStackParamList, 'PoolSettings'>;

/**
 * POOLS-1 (delete)/POOLS-4 (rename/visibility/membersCanInvite)/POOLS-7
 * (ownership transfer, Bolt 8) — owner-only settings. Deleting the pool is
 * allowed at any time (ADR-033). `TransferOwnershipPanel` is the standalone
 * transfer affordance model.md's opening section approved as a deliberate
 * mobile-specific addition beyond `betmeet-clone` (ADR-040) — hidden when
 * there is no other member to transfer to.
 */
export function PoolSettingsScreen({ route, navigation }: Props) {
  const { poolId } = route.params;
  const { data: detail, isLoading } = usePoolDetailQuery(poolId);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const renameMutation = useRenamePoolMutation();
  const visibilityMutation = useUpdateVisibilityMutation();
  const membersCanInviteMutation = useUpdateMembersCanInviteMutation();
  const deleteMutation = useDeletePoolMutation();

  useEffect(() => {
    if (detail?.ok) setName(detail.pool.name);
  }, [detail]);

  const handleRename = useCallback(async () => {
    setError(null);
    if (!validatePoolName(name)) {
      setError('Name must be 3-60 characters.');
      return;
    }
    const result = await renameMutation.mutateAsync({ poolId, name });
    if (!result.ok && result.error === 'NAME_TAKEN') {
      setError('A public pool with this name already exists.');
    } else if (!result.ok) {
      setError("Couldn't rename this pool.");
    }
  }, [renameMutation, poolId, name]);

  const handleToggleVisibility = useCallback(async () => {
    if (!detail?.ok) return;
    setError(null);
    const targetType = detail.pool.type === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    const result = await visibilityMutation.mutateAsync({ poolId, type: targetType });
    if (!result.ok && result.error === 'NAME_TAKEN') {
      setError('A public pool with this name already exists — rename before switching to public.');
    }
  }, [detail, visibilityMutation, poolId]);

  const handleToggleMembersCanInvite = useCallback(
    (value: boolean) => {
      membersCanInviteMutation.mutate({ poolId, membersCanInvite: value });
    },
    [membersCanInviteMutation, poolId],
  );

  const handleDelete = useCallback(async () => {
    const result = await deleteMutation.mutateAsync(poolId);
    if (result.ok) {
      navigation.popToTop();
    }
  }, [deleteMutation, poolId, navigation]);

  if (isLoading || !detail || !detail.ok) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pool name</Text>
      <TextInput accessibilityLabel="Pool name" value={name} onChangeText={setName} style={styles.input} />
      <Button title="Save name" onPress={handleRename} />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Public pool</Text>
        <Switch
          accessibilityLabel="Public pool"
          value={detail.pool.type === 'PUBLIC'}
          onValueChange={handleToggleVisibility}
        />
      </View>

      {detail.pool.type === 'PRIVATE' ? (
        <View style={styles.switchRow}>
          <Text style={styles.label}>Members can invite</Text>
          <Switch
            accessibilityLabel="Members can invite"
            value={detail.pool.membersCanInvite}
            onValueChange={handleToggleMembersCanInvite}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TransferOwnershipPanel poolId={poolId} members={detail.members} />

      <View style={styles.dangerZone}>
        <Text style={styles.label}>Delete this pool</Text>
        <Text style={styles.meta}>
          This cannot be undone. To hand off ownership instead, use "Transfer ownership" above.
        </Text>
        <Button title="Delete pool" color="#cc3333" onPress={handleDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  error: {
    color: '#cc3333',
  },
  dangerZone: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
});
