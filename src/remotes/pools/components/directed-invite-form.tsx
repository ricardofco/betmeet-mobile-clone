import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCreateDirectedInviteMutation } from '@/remotes/pools/hooks/use-pools-query';
import { canInvite, isPlausibleInviteTarget, type PoolForInvitePermission } from '@/domain/pools';

type DirectedInviteFormProps = {
  poolId: string;
  pool: PoolForInvitePermission;
  viewerIsOwner: boolean;
};

const ERROR_COPY_KEY: Record<string, string> = {
  VALIDATION_FAILED: 'pools.directedInviteForm.errors.VALIDATION_FAILED',
  NOT_FOUND: 'pools.directedInviteForm.errors.NOT_FOUND',
  NOT_MEMBER: 'pools.directedInviteForm.errors.NOT_MEMBER',
  PERMISSION_DENIED: 'pools.directedInviteForm.errors.PERMISSION_DENIED',
  SELF_INVITE: 'pools.directedInviteForm.errors.SELF_INVITE',
  UNRESOLVABLE: 'pools.directedInviteForm.errors.UNRESOLVABLE',
};

/**
 * POOLS-3 (model.md §2, design.md §4) — targeted invite by nickname or
 * email. Gated by the same `canInvite` rule Bolt 7's `InviteTokenPanel`
 * already uses (owner always; PUBLIC any member; PRIVATE only if
 * `membersCanInvite`) — this bolt makes it a real write-capability gate,
 * re-checked authoritatively server-side regardless of this UI decision.
 */
export function DirectedInviteForm({ poolId, pool, viewerIsOwner }: DirectedInviteFormProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useCreateDirectedInviteMutation();

  const handleSubmit = useCallback(async () => {
    setError(null);
    setMessage(null);
    if (!isPlausibleInviteTarget(target)) {
      setError(t(ERROR_COPY_KEY.VALIDATION_FAILED));
      return;
    }
    const result = await mutation.mutateAsync({ poolId, target });
    if (!result.ok) {
      setError(ERROR_COPY_KEY[result.error] ? t(ERROR_COPY_KEY[result.error]) : t('pools.directedInviteForm.genericError'));
      return;
    }
    setTarget('');
    setMessage(result.resolved ? t('pools.directedInviteForm.sent') : t('pools.directedInviteForm.savedNoAccount'));
  }, [mutation, poolId, target, t]);

  if (!canInvite(pool, viewerIsOwner)) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('pools.directedInviteForm.label')}</Text>
      <Text style={styles.hint}>{t('pools.directedInviteForm.hint')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Invite target"
          autoCapitalize="none"
          onChangeText={setTarget}
          placeholder={t('pools.directedInviteForm.placeholder')}
          style={styles.input}
          value={target}
        />
        {mutation.isPending ? (
          <ActivityIndicator />
        ) : (
          <Button title={t('pools.directedInviteForm.submit')} onPress={handleSubmit} disabled={target.trim().length < 3} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
  },
  error: {
    color: '#cc3333',
    fontSize: 12,
  },
  message: {
    color: '#059669',
    fontSize: 12,
  },
});
