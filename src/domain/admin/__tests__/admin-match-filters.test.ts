import { matchesEligibleForForceResult, matchesWithActiveOverride } from '@/domain/admin/admin-match-filters';
import type { AdminMatchRow } from '@/domain/admin/admin-match-row';

function makeRow(overrides: Partial<AdminMatchRow> & Pick<AdminMatchRow, 'id'>): AdminMatchRow {
  return {
    fifaHome: 'ARG',
    fifaAway: 'FRA',
    homeTeamId: 't1',
    awayTeamId: 't2',
    bothTeamsResolved: true,
    isKnockout: false,
    kickoffAt: null,
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    winnerTeamId: null,
    manualOverride: false,
    manualOverrideReason: null,
    overriddenByNickname: null,
    overriddenAt: null,
    ...overrides,
  };
}

describe('matchesEligibleForForceResult (ADMIN-4 picker, BR-7.4)', () => {
  it('includes a match with both teams resolved', () => {
    const rows = [makeRow({ id: 'm1', bothTeamsResolved: true })];
    expect(matchesEligibleForForceResult(rows)).toEqual(rows);
  });

  it('excludes an unresolved knockout placeholder', () => {
    const rows = [makeRow({ id: 'm1', bothTeamsResolved: false, homeTeamId: null, awayTeamId: null })];
    expect(matchesEligibleForForceResult(rows)).toEqual([]);
  });

  it('filters a mixed list to only the resolved rows', () => {
    const resolved = makeRow({ id: 'resolved', bothTeamsResolved: true });
    const unresolved = makeRow({ id: 'unresolved', bothTeamsResolved: false });
    expect(matchesEligibleForForceResult([resolved, unresolved])).toEqual([resolved]);
  });
});

describe('matchesWithActiveOverride (ADMIN-5 picker)', () => {
  it('includes a match with an active manual override', () => {
    const rows = [makeRow({ id: 'm1', manualOverride: true })];
    expect(matchesWithActiveOverride(rows)).toEqual(rows);
  });

  it('excludes a match with no override', () => {
    const rows = [makeRow({ id: 'm1', manualOverride: false })];
    expect(matchesWithActiveOverride(rows)).toEqual([]);
  });

  it('filters a mixed list to only the overridden rows', () => {
    const overridden = makeRow({ id: 'overridden', manualOverride: true });
    const notOverridden = makeRow({ id: 'not-overridden', manualOverride: false });
    expect(matchesWithActiveOverride([overridden, notOverridden])).toEqual([overridden]);
  });
});
