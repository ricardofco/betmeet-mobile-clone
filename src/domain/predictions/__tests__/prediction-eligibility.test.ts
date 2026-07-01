import { getPredictionEligibility, describeLockReason } from '@/domain/predictions/prediction-eligibility';
import type { EligibilityMatchInput } from '@/domain/predictions/prediction-eligibility';

const RESOLVED_HOME = { id: 'home', fifaCode: 'GER', name: 'Germany', flagKey: 'ger' };
const RESOLVED_AWAY = { id: 'away', fifaCode: 'NED', name: 'Netherlands', flagKey: 'ned' };

function makeMatch(overrides: Partial<EligibilityMatchInput> = {}): EligibilityMatchInput {
  return {
    status: 'SCHEDULED',
    kickoffAt: '2026-06-15T18:00:00Z',
    homeTeam: RESOLVED_HOME,
    awayTeam: RESOLVED_AWAY,
    ...overrides,
  };
}

describe('getPredictionEligibility (model.md §2, domain-overview.md §4.2)', () => {
  it('is editable when SCHEDULED, both teams resolved, and now is before kickoff', () => {
    const match = makeMatch();
    const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
    expect(result).toEqual({ editable: true });
  });

  it('is MATCH_NOT_EDITABLE when the home team slot is null', () => {
    const match = makeMatch({ homeTeam: null });
    const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'MATCH_NOT_EDITABLE' });
  });

  it('is MATCH_NOT_EDITABLE when the away team slot is null', () => {
    const match = makeMatch({ awayTeam: null });
    const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'MATCH_NOT_EDITABLE' });
  });

  it('is MATCH_NOT_EDITABLE when there is no kickoff time, even with both teams resolved', () => {
    const match = makeMatch({ kickoffAt: null });
    const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'MATCH_NOT_EDITABLE' });
  });

  it('is KICKOFF_REACHED the instant now equals kickoffAt (no grace period)', () => {
    const match = makeMatch({ kickoffAt: '2026-06-15T18:00:00Z' });
    const result = getPredictionEligibility(match, '2026-06-15T18:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'KICKOFF_REACHED' });
  });

  it('is KICKOFF_REACHED one second after kickoffAt', () => {
    const match = makeMatch({ kickoffAt: '2026-06-15T18:00:00Z' });
    const result = getPredictionEligibility(match, '2026-06-15T18:00:01Z');
    expect(result).toEqual({ editable: false, reason: 'KICKOFF_REACHED' });
  });

  it('is still editable one second before kickoffAt', () => {
    const match = makeMatch({ kickoffAt: '2026-06-15T18:00:00Z' });
    const result = getPredictionEligibility(match, '2026-06-15T17:59:59Z');
    expect(result).toEqual({ editable: true });
  });

  it('KICKOFF_REACHED takes precedence over CANCELLED (branch order: lock cutoff before status checks)', () => {
    const match = makeMatch({ status: 'CANCELLED', kickoffAt: '2026-06-15T18:00:00Z' });
    const result = getPredictionEligibility(match, '2026-06-15T18:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'KICKOFF_REACHED' });
  });

  it('is CANCELLED when status is CANCELLED and kickoff has not passed', () => {
    const match = makeMatch({ status: 'CANCELLED' });
    const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'CANCELLED' });
  });

  it('is POSTPONED when status is POSTPONED and kickoff has not passed', () => {
    const match = makeMatch({ status: 'POSTPONED' });
    const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
    expect(result).toEqual({ editable: false, reason: 'POSTPONED' });
  });

  it.each(['LIVE', 'FINISHED', 'LOCKED'] as const)(
    'is MATCH_STATUS_LOCKED when status is %s and kickoff has not passed',
    status => {
      const match = makeMatch({ status });
      const result = getPredictionEligibility(match, '2026-06-15T17:00:00Z');
      expect(result).toEqual({ editable: false, reason: 'MATCH_STATUS_LOCKED' });
    },
  );

  it('is a pure function of its inputs — same inputs always produce the same result', () => {
    const match = makeMatch();
    const now = '2026-06-15T17:00:00Z';
    expect(getPredictionEligibility(match, now)).toEqual(getPredictionEligibility(match, now));
  });
});

describe('describeLockReason', () => {
  it('returns non-empty display copy for every PredictionLockReason', () => {
    const reasons = ['MATCH_NOT_EDITABLE', 'KICKOFF_REACHED', 'CANCELLED', 'POSTPONED', 'MATCH_STATUS_LOCKED'] as const;
    for (const reason of reasons) {
      expect(describeLockReason(reason).length).toBeGreaterThan(0);
    }
  });
});
