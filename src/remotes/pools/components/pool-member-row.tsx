import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolMember } from '@/domain/pools';

type PoolMemberRowProps = {
  member: PoolMember;
  /** Only true when the viewer is the owner AND this row isn't the owner's own (model.md §6 canKick). */
  canKick: boolean;
  onKick: (userId: string) => void;
};

/**
 * One row in `pool-detail-screen.tsx`'s member list — `React.memo`-wrapped
 * per `vercel-react-native-skills`' list-item memoization rule (design.md
 * §8), same discipline as `PoolListItem`.
 */
function PoolMemberRowComponent({ member, canKick, onKick }: PoolMemberRowProps) {
  const { t } = useTranslation();
  const handleKick = () => onKick(member.userId);

  return (
    <View style={styles.row}>
      <View style={styles.textColumn}>
        <Text style={styles.nickname}>{member.nickname ?? t('pools.memberRow.unnamedMember')}</Text>
        {member.isOwner ? <Text style={styles.ownerBadge}>{t('pools.memberRow.owner')}</Text> : null}
      </View>
      {canKick ? (
        <Pressable accessibilityRole="button" onPress={handleKick} style={styles.kickButton}>
          <Text style={styles.kickButtonText}>{t('pools.memberRow.kick')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const PoolMemberRow = memo(PoolMemberRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  textColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nickname: {
    fontSize: 15,
  },
  ownerBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#996600',
  },
  kickButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  kickButtonText: {
    color: '#cc3333',
    fontWeight: '600',
  },
});
