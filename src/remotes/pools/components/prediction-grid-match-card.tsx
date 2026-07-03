import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PredictionGridCell } from '@/remotes/pools/components/prediction-grid-cell';
import { getPredictionEligibility } from '@/domain/predictions';
import type { MatchStatus } from '@/domain/competition';
import type { PoolMatchSummary, PoolMemberPredictionCell } from '@/platform/backend-api/pools-api';
import type { PoolMember } from '@/domain/pools';

type PredictionGridMatchCardProps = {
  match: PoolMatchSummary;
  members: PoolMember[];
  cellsForMatch: Map<string, PoolMemberPredictionCell>;
  viewerId: string;
  now: string;
  onSaveViewerPrediction: (matchId: string, homeScore: number, awayScore: number) => void;
  onResetViewerOverride: (matchId: string) => void;
  isSavingViewer: boolean;
  isResettingViewer: boolean;
};

function teamLabel(team: PoolMatchSummary['homeTeam']): string {
  if (!team) return '?';
  return 'fifaCode' in team ? team.fifaCode : team.label;
}

function formatKickoffTime(kickoffAt: string | null): string {
  if (!kickoffAt) return 'TBD';
  return new Date(kickoffAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * POOLS-6 — one match's card: header (teams/kickoff/score) + every
 * member's prediction row (model.md §5, design.md §4). This is a
 * pools-remote-owned component, not a reuse of `src/host/predictions/`'s
 * `PredictionMatchCard` — see ADR-037.
 */
function PredictionGridMatchCardComponent({
  match,
  members,
  cellsForMatch,
  viewerId,
  now,
  onSaveViewerPrediction,
  onResetViewerOverride,
  isSavingViewer,
  isResettingViewer,
}: PredictionGridMatchCardProps) {
  const eligibility = useMemo(
    () =>
      getPredictionEligibility(
        { status: match.matchStatus as MatchStatus, kickoffAt: match.kickoffAt, homeTeam: match.homeTeam, awayTeam: match.awayTeam },
        now,
      ),
    [match, now],
  );

  const scoreLabel =
    match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : 'vs';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.teams}>
          {teamLabel(match.homeTeam)} {scoreLabel} {teamLabel(match.awayTeam)}
        </Text>
        <Text style={styles.kickoff}>{formatKickoffTime(match.kickoffAt)}</Text>
      </View>
      {members.map(member => (
        <PredictionGridCell
          key={member.userId}
          cell={cellsForMatch.get(member.userId)}
          nickname={member.nickname}
          isViewer={member.userId === viewerId}
          canEdit={member.userId === viewerId && eligibility.editable}
          onSave={(homeScore, awayScore) => onSaveViewerPrediction(match.matchId, homeScore, awayScore)}
          onReset={() => onResetViewerOverride(match.matchId)}
          isSaving={isSavingViewer}
          isResetting={isResettingViewer}
        />
      ))}
    </View>
  );
}

export const PredictionGridMatchCard = memo(PredictionGridMatchCardComponent);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  teams: {
    fontSize: 13,
    fontWeight: '700',
  },
  kickoff: {
    fontSize: 11,
    color: '#6B7280',
  },
});
