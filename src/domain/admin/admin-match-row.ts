import type { MatchStatus } from '@/domain/competition/match-status';

/**
 * Raw match row as returned by `admin.listMatches` (design.md §6) — the
 * shape `admin-match-filters.ts`'s two pure filters operate over, and the
 * shape `ForceResultScreen`/`RevertOverrideScreen`'s match pickers render.
 *
 * @invariant (ADR-060) This type deliberately mirrors, but is NOT reused
 * from, `competition.getFixture`'s public response shape — carrying
 * `manualOverride`/`manualOverrideReason`/`overriddenByNickname` here would
 * leak another admin's identity + free-text justification if this type (or
 * its backing capability) were ever conflated with the public fixture read.
 * `admin.listMatches` stays a fully separate, admin-gated capability.
 */
export type AdminMatchRow = {
  id: string;
  /** Display-only FIFA trigram — `null` for an unresolved knockout placeholder. */
  fifaHome: string | null;
  fifaAway: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  bothTeamsResolved: boolean;
  isKnockout: boolean;
  kickoffAt: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winnerTeamId: string | null;
  manualOverride: boolean;
  manualOverrideReason: string | null;
  /** Resolved server-side, mirrors `nicknameOf()` in `handlers.ts`. */
  overriddenByNickname: string | null;
  overriddenAt: string | null;
};
