import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlagBadge } from '@/shared/competition/flags';
import { describeTeamSlot, isResolvedTeam, type TeamSlot } from '@/domain/competition';

type TeamBadgeProps = {
  team: TeamSlot;
  /** Visually reverses flag/name order for the away side. */
  align?: 'home' | 'away';
};

/**
 * One team's display row: flag + FIFA trigram + full name (COMPETITION-1 AC:
 * "each match card shows both teams (name + flag + FIFA trigram)").
 * Renders the knockout-placeholder label (never blank) when the slot has no
 * resolved team yet (COMPETITION-1 AC, model.md §4).
 *
 * `React.memo`-wrapped per `vercel-react-native-skills`' list-item
 * memoization rule — this renders twice per row inside `fixture-list.tsx`'s
 * FlashList (home + away), so memoization avoids re-rendering both badges
 * whenever an unrelated sibling match updates.
 */
function TeamBadgeComponent({ team, align = 'home' }: TeamBadgeProps) {
  const label = describeTeamSlot(team);
  const isAway = align === 'away';

  return (
    <View style={[styles.row, isAway && styles.rowReversed]}>
      {isResolvedTeam(team) ? (
        <FlagBadge flagKey={team.flagKey} />
      ) : (
        <View style={styles.flagPlaceholder} />
      )}
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
        {isResolvedTeam(team) ? <Text style={styles.trigram}>{team.fifaCode}</Text> : null}
      </View>
    </View>
  );
}

export const TeamBadge = memo(TeamBadgeComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rowReversed: {
    flexDirection: 'row-reverse',
  },
  flagPlaceholder: {
    width: 24,
    height: 18,
  },
  textColumn: {
    flexShrink: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  trigram: {
    fontSize: 11,
    color: '#6B7280',
  },
});
