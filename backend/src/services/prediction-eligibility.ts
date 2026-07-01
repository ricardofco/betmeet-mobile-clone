import type { CompetitionPhaseType, Match, MatchStatus } from '../generated/prisma/client';

/**
 * Server-side re-validation of prediction eligibility/entry, independently
 * authored (Prisma models, not imported) but same rules as mobile's
 * src/domain/predictions/ — the backend is the authoritative check
 * regardless of what the client believes (system-context.md §3).
 */
export function isMatchEditable(match: Pick<Match, 'status' | 'kickoffAt'>, now: Date): boolean {
  if (match.status !== 'SCHEDULED') return false;
  if (match.kickoffAt && now.getTime() >= match.kickoffAt.getTime()) return false;
  return true;
}

export function validateScoreBounds(homeScore: number, awayScore: number): boolean {
  return (
    Number.isInteger(homeScore) &&
    Number.isInteger(awayScore) &&
    homeScore >= 0 &&
    homeScore <= 20 &&
    awayScore >= 0 &&
    awayScore <= 20
  );
}

/** Penalty-winner is required iff knockout + tied score; forbidden otherwise (domain-overview.md §5.4). */
export function validatePenaltyWinnerRule(
  isKnockout: boolean,
  homeScore: number,
  awayScore: number,
  penaltyWinner: 'home' | 'away' | null,
): boolean {
  const isTiedKnockout = isKnockout && homeScore === awayScore;
  if (isTiedKnockout) return penaltyWinner === 'home' || penaltyWinner === 'away';
  return penaltyWinner === null;
}

export type MatchStatusLike = MatchStatus;
export type CompetitionPhaseTypeLike = CompetitionPhaseType;
