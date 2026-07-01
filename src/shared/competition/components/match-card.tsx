import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamBadge } from '@/shared/competition/components/team-badge';
import { LiveIndicator } from '@/shared/competition/components/live-indicator';
import { describeMatchStatus, isLiveStatus, type Match } from '@/domain/competition';

type MatchCardProps = {
  match: Match;
};

function formatKickoffTime(kickoffAt: string | null): string {
  if (!kickoffAt) return 'TBD';
  const date = new Date(kickoffAt);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatScore(value: number | null): string {
  return value === null ? '–' : String(value);
}

/**
 * One match row (COMPETITION-1 AC): both teams (flag + FIFA trigram + name),
 * localized kickoff time, and current status. `React.memo`-wrapped — this is
 * the per-row component inside `fixture-list.tsx`'s FlashList
 * (`vercel-react-native-skills` list-item memoization rule, ADR-022). No
 * inline function/object props are created by the parent list per row (the
 * list passes only the already-fetched `match` value), so this component's
 * memoization is effective rather than defeated by a fresh callback identity
 * every render.
 */
function MatchCardComponent({ match }: MatchCardProps) {
  const statusDisplay = describeMatchStatus(match.status);
  const live = isLiveStatus(match.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kickoff}>{formatKickoffTime(match.kickoffAt)}</Text>
        {live ? <LiveIndicator /> : <Text style={styles.statusLabel}>{statusDisplay.label}</Text>}
      </View>
      <View style={styles.teams}>
        <TeamBadge team={match.homeTeam} align="home" />
        <View style={styles.scoreColumn}>
          <Text style={styles.score}>
            {formatScore(match.homeScore)} – {formatScore(match.awayScore)}
          </Text>
          {match.homePenaltyScore !== null && match.awayPenaltyScore !== null ? (
            <Text style={styles.penaltyScore}>
              ({formatScore(match.homePenaltyScore)} – {formatScore(match.awayPenaltyScore)} pen.)
            </Text>
          ) : null}
        </View>
        <TeamBadge team={match.awayTeam} align="away" />
      </View>
    </View>
  );
}

export const MatchCard = memo(MatchCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kickoff: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreColumn: {
    alignItems: 'center',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
  penaltyScore: {
    fontSize: 10,
    color: '#6B7280',
  },
});
