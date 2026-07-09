import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useTransferOwnershipMutation } from '@/remotes/pools/hooks/use-pools-query';
import { transferCandidates, type PoolMember } from '@/domain/pools';

type TransferOwnershipPanelProps = {
  poolId: string;
  members: PoolMember[];
  onTransferred?: () => void;
};

/**
 * POOLS-7 (model.md §3, design.md §4/§7, ADR-040) — the standalone,
 * voluntary ownership-transfer affordance in Pool Settings. A deliberate
 * mobile-specific addition beyond `betmeet-clone` (which only transfers
 * ownership as a side-effect of account deletion) — approved at Model
 * stage. Hidden entirely when there is no other member to transfer to.
 */
export function TransferOwnershipPanel({ poolId, members, onTransferred }: TransferOwnershipPanelProps) {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useTransferOwnershipMutation();
  const candidates = transferCandidates(members);

  const handleTransfer = useCallback(async () => {
    if (!selectedUserId) return;
    setError(null);
    const result = await mutation.mutateAsync({ poolId, newOwnerId: selectedUserId });
    if (!result.ok) {
      setError(
        result.error === 'INVALID_TARGET'
          ? t('pools.transferOwnershipPanel.invalidTargetError')
          : t('pools.transferOwnershipPanel.genericError'),
      );
      return;
    }
    setSelectedUserId(null);
    onTransferred?.();
  }, [mutation, poolId, selectedUserId, onTransferred, t]);

  if (candidates.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('pools.transferOwnershipPanel.label')}</Text>
      <Text style={styles.hint}>{t('pools.transferOwnershipPanel.hint')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {candidates.map(candidate => (
        <Button
          key={candidate.userId}
          title={
            selectedUserId === candidate.userId
              ? `✓ ${candidate.nickname ?? candidate.userId}`
              : (candidate.nickname ?? candidate.userId)
          }
          onPress={() => setSelectedUserId(candidate.userId)}
        />
      ))}
      {mutation.isPending ? (
        <ActivityIndicator />
      ) : (
        <Button
          title={t('pools.transferOwnershipPanel.submit')}
          color="#cc3333"
          disabled={!selectedUserId}
          onPress={handleTransfer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
  },
  error: {
    color: '#cc3333',
    fontSize: 12,
  },
});
