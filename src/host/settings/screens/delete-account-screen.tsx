import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  useDeleteAccountMutation,
  useOwnedPoolsForDeletionQuery,
} from '@/host/settings/hooks/use-account-deletion-query';
import {
  allOwnersAssigned,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  isConfirmPhraseValid,
  poolsNeedingAssignment,
  poolsToBeDeleted,
  type OwnershipAssignment,
} from '@/domain/auth';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'DeleteAccount'>;

/**
 * AUTH-6 (model.md §4, design.md §4/§7) — irreversible account deletion.
 * POOLS-7's ownership-transfer capability is required inline here for any
 * owned pool with other members (a deliberate cross-unit dependency, per
 * the bolt plan's own framing of why AUTH-6 is sequenced into this bolt).
 *
 * Screen class: `protected`, same as every other Settings row.
 */
export function DeleteAccountScreen({ navigation: _navigation }: Props) {
  const [phrase, setPhrase] = useState('');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ownedPoolsQuery = useOwnedPoolsForDeletionQuery(true);
  const deleteMutation = useDeleteAccountMutation();

  const owned = useMemo(() => ownedPoolsQuery.data ?? [], [ownedPoolsQuery.data]);
  const poolsRequiringAssignment = useMemo(() => poolsNeedingAssignment(owned), [owned]);
  const poolsThatWillBeDeleted = useMemo(() => poolsToBeDeleted(owned), [owned]);

  const assignmentList: OwnershipAssignment[] = useMemo(
    () => Object.entries(assignments).map(([poolId, newOwnerId]) => ({ poolId, newOwnerId })),
    [assignments],
  );

  const allAssigned = allOwnersAssigned(owned, assignmentList);
  const phraseValid = isConfirmPhraseValid(phrase);
  const canSubmit = phraseValid && allAssigned && !deleteMutation.isPending;

  const handleSelectSuccessor = useCallback((poolId: string, newOwnerId: string) => {
    setAssignments(prev => ({ ...prev, [poolId]: newOwnerId }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitError(null);
    const result = await deleteMutation.mutateAsync(assignmentList);
    if (!result.ok) {
      setSubmitError(
        result.error === 'MISSING_ASSIGNMENT'
          ? 'Choose a new owner for every pool listed below.'
          : "Couldn't delete your account. Please try again.",
      );
      return;
    }
    // Model §4: the account is hard-deleted server-side; the client still
    // needs an explicit sign-out to clear the now-stale local session
    // (mirrors betmeet-clone's own explicit signOut() right after success).
    await getSupabaseAdapter().signOut();
    // AuthGatedNavigator reacts to the now-null session automatically —
    // no explicit navigation call needed here (same as every other
    // sign-out path in this app).
  }, [canSubmit, deleteMutation, assignmentList]);

  if (ownedPoolsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Delete account</Text>
      <Text style={styles.body}>
        This is permanent and cannot be undone. Your predictions and pool history are removed and your nickname
        is released.
      </Text>

      {poolsRequiringAssignment.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transfer your pools</Text>
          {poolsRequiringAssignment.map(pool => (
            <View key={pool.poolId} style={styles.poolRow}>
              <Text style={styles.poolName}>{pool.poolName}</Text>
              {pool.candidates.map(candidate => (
                <Button
                  key={candidate.userId}
                  title={
                    assignments[pool.poolId] === candidate.userId
                      ? `✓ ${candidate.nickname ?? candidate.userId}`
                      : (candidate.nickname ?? candidate.userId)
                  }
                  onPress={() => handleSelectSuccessor(pool.poolId, candidate.userId)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {poolsThatWillBeDeleted.length > 0 ? (
        <Text style={styles.body}>
          These pools have no other members and will be deleted: {poolsThatWillBeDeleted.map(p => p.poolName).join(', ')}.
        </Text>
      ) : null}

      <Text style={styles.sectionLabel}>Confirm</Text>
      <Text style={styles.body}>
        Type &quot;{DELETE_ACCOUNT_CONFIRM_PHRASE}&quot; to confirm.
      </Text>
      <TextInput
        accessibilityLabel="Confirmation phrase"
        autoCapitalize="none"
        onChangeText={setPhrase}
        style={styles.input}
        value={phrase}
      />

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      {deleteMutation.isPending ? (
        <ActivityIndicator />
      ) : (
        <Button title="Delete my account" color="#cc3333" disabled={!canSubmit} onPress={handleDelete} />
      )}
    </ScrollView>
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
  },
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#555',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
  },
  poolRow: {
    gap: 4,
  },
  poolName: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  error: {
    color: '#b00020',
  },
});
