import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useJoinByTokenMutation } from '@/remotes/pools/hooks/use-pools-query';
import { isPlausibleInviteToken, normalizeInviteToken } from '@/domain/pools';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';

type Props = NativeStackScreenProps<PoolsStackParamList, 'JoinByToken'>;

/**
 * POOLS-2 — join a pool via invite token/link. `isPlausibleInviteToken`
 * (model.md §4) is a fast, offline shape pre-check before even hitting the
 * network — the backend's `pools.joinByToken` is the actual existence +
 * capacity gate (design.md §2.1/ADR-035).
 */
export function JoinByTokenScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const joinMutation = useJoinByTokenMutation();

  const isPlausible = isPlausibleInviteToken(token);
  const canSubmit = isPlausible && !joinMutation.isPending;

  const handleSubmit = useCallback(async () => {
    setError(null);
    const result = await joinMutation.mutateAsync(normalizeInviteToken(token));
    if (result.ok) {
      navigation.replace('PoolDetail', { poolId: result.poolId });
    } else if (result.error === 'FULL') {
      setError(t('pools.joinByToken.fullError'));
    } else if (result.error === 'NOT_FOUND') {
      setError(t('pools.joinByToken.notFoundError'));
    } else {
      setError(t('pools.joinByToken.genericError'));
    }
  }, [joinMutation, token, navigation, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('pools.joinByToken.label')}</Text>
      <TextInput
        accessibilityLabel="Invite code"
        value={token}
        onChangeText={setToken}
        style={styles.input}
        autoCapitalize="characters"
        placeholder={t('pools.joinByToken.placeholder')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={t('pools.joinByToken.submit')} onPress={handleSubmit} disabled={!canSubmit} />
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
  error: {
    color: '#cc3333',
    marginBottom: 8,
  },
});
