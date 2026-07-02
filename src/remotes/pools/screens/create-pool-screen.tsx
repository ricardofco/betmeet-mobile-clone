import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useCreatePoolMutation } from '@/remotes/pools/hooks/use-pools-query';
import { validatePoolCapacity, validatePoolName, MIN_POOL_CAPACITY, MAX_POOL_CAPACITY } from '@/domain/pools';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';
import type { PoolVisibility } from '@/domain/pools';

type Props = NativeStackScreenProps<PoolsStackParamList, 'CreatePool'>;

/**
 * POOLS-1 — create a pool. Client-side validation (`validatePoolName`/
 * `validatePoolCapacity`, model.md §2/§3) is a fast pre-check only — the
 * backend's `pools.create` handler re-validates and additionally checks
 * public-name uniqueness, which cannot be checked client-side at all
 * (design.md §2.1/ADR-035).
 */
export function CreatePoolScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PoolVisibility>('PRIVATE');
  const [capacity, setCapacity] = useState(String(MIN_POOL_CAPACITY));
  const [membersCanInvite, setMembersCanInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreatePoolMutation();

  const parsedCapacity = Number(capacity);
  const isNameValid = validatePoolName(name);
  const isCapacityValid = validatePoolCapacity(parsedCapacity);
  const canSubmit = isNameValid && isCapacityValid && !createMutation.isPending;

  const handleTogglePublic = useCallback(() => {
    setType(current => (current === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'));
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const result = await createMutation.mutateAsync({
      name,
      type,
      capacity: parsedCapacity,
      membersCanInvite,
    });
    if (result.ok) {
      navigation.replace('PoolDetail', { poolId: result.pool.id });
    } else if (result.error === 'NAME_TAKEN') {
      setError('A public pool with this name already exists.');
    } else {
      setError('Please check the pool details.');
    }
  }, [createMutation, name, type, parsedCapacity, membersCanInvite, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pool name</Text>
      <TextInput
        accessibilityLabel="Pool name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="My league"
      />

      <Text style={styles.label}>Capacity ({MIN_POOL_CAPACITY}-{MAX_POOL_CAPACITY})</Text>
      <TextInput
        accessibilityLabel="Capacity"
        value={capacity}
        onChangeText={setCapacity}
        style={styles.input}
        keyboardType="number-pad"
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Public pool</Text>
        <Switch accessibilityLabel="Public pool" value={type === 'PUBLIC'} onValueChange={handleTogglePublic} />
      </View>

      {type === 'PRIVATE' ? (
        <View style={styles.switchRow}>
          <Text style={styles.label}>Members can invite</Text>
          <Switch
            accessibilityLabel="Members can invite"
            value={membersCanInvite}
            onValueChange={setMembersCanInvite}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Create pool" onPress={handleSubmit} disabled={!canSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  error: {
    color: '#cc3333',
    marginBottom: 8,
  },
});
