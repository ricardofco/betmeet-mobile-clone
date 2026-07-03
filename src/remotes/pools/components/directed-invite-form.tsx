import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCreateDirectedInviteMutation } from '@/remotes/pools/hooks/use-pools-query';
import { canInvite, isPlausibleInviteTarget, type PoolForInvitePermission } from '@/domain/pools';

type DirectedInviteFormProps = {
  poolId: string;
  pool: PoolForInvitePermission;
  viewerIsOwner: boolean;
};

const ERROR_COPY: Record<string, string> = {
  VALIDATION_FAILED: 'Enter a nickname (name#1234) or an email address.',
  NOT_FOUND: 'Pool not found.',
  NOT_MEMBER: 'You must be a member of this pool to invite.',
  PERMISSION_DENIED: "This pool's owner hasn't enabled member invites.",
  SELF_INVITE: "You can't invite yourself.",
  UNRESOLVABLE: "We couldn't find a user with that nickname. Try name#1234 or an email.",
};

/**
 * POOLS-3 (model.md §2, design.md §4) — targeted invite by nickname or
 * email. Gated by the same `canInvite` rule Bolt 7's `InviteTokenPanel`
 * already uses (owner always; PUBLIC any member; PRIVATE only if
 * `membersCanInvite`) — this bolt makes it a real write-capability gate,
 * re-checked authoritatively server-side regardless of this UI decision.
 */
export function DirectedInviteForm({ poolId, pool, viewerIsOwner }: DirectedInviteFormProps) {
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useCreateDirectedInviteMutation();

  const handleSubmit = useCallback(async () => {
    setError(null);
    setMessage(null);
    if (!isPlausibleInviteTarget(target)) {
      setError(ERROR_COPY.VALIDATION_FAILED);
      return;
    }
    const result = await mutation.mutateAsync({ poolId, target });
    if (!result.ok) {
      setError(ERROR_COPY[result.error] ?? "Couldn't send the invite.");
      return;
    }
    setTarget('');
    setMessage(result.resolved ? 'Invite sent.' : "Invite saved — we'll notify them if they sign up.");
  }, [mutation, poolId, target]);

  if (!canInvite(pool, viewerIsOwner)) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Invite someone</Text>
      <Text style={styles.hint}>Nickname (name#1234) or email</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Invite target"
          autoCapitalize="none"
          onChangeText={setTarget}
          placeholder="name#1234 or email"
          style={styles.input}
          value={target}
        />
        {mutation.isPending ? (
          <ActivityIndicator />
        ) : (
          <Button title="Invite" onPress={handleSubmit} disabled={target.trim().length < 3} />
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
