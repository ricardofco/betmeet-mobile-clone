/**
 * First handler-level Jest suite in this backend (every prior bolt's
 * `handlers.ts` coverage came exclusively from real curl + live-DB
 * verification, `jest.config.js`'s own header comment records the
 * "pure functions only" convention through Bolt 10). This bolt earns a
 * deliberate, narrow exception: ADMIN-4/5 are the highest-blast-radius
 * mutations in the whole plan (model.md §7), and the single most important
 * regression here — every non-`checkAccess` `admin.*` handler MUST reject a
 * non-admin caller with `FORBIDDEN`, before touching any data — is worth
 * proving at the unit level IN ADDITION TO the real curl+DB pass
 * (`implement-and-test.md`), not instead of it. `prisma`, `requireAdmin`,
 * and `scoreMatch` are mocked; `sweep-status.ts` (a pure in-memory tracker)
 * is used for real to also prove the handler/tracker wiring end-to-end.
 */
const prismaMock = {
  match: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../db', () => ({ prisma: prismaMock }));

const requireAdminMock = jest.fn();
jest.mock('../../services/admin/require-admin', () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));

const scoreMatchMock = jest.fn();
jest.mock('../../services/scoring/score-match', () => ({
  scoreMatch: (...args: unknown[]) => scoreMatchMock(...args),
}));

const sweepFinishedUnscoredMatchesMock = jest.fn();
jest.mock('../../services/scoring/score-sweeper', () => ({
  sweepFinishedUnscoredMatches: (...args: unknown[]) => sweepFinishedUnscoredMatchesMock(...args),
}));

import { handlers } from '../handlers';
import { getSweepStatus, recordSweepRun } from '../../services/scoring/sweep-status';

function auth(overrides: Partial<{ userId: string }> = {}) {
  return {
    userId: 'user-1',
    emailVerified: true,
    onboardingCompleted: true,
    accountDeleted: false,
    ...overrides,
  };
}

function knockoutMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    homeTeamId: 't-home',
    awayTeamId: 't-away',
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    winnerTeamId: null,
    status: 'SCHEDULED',
    manual_override: false,
    manual_override_reason: null,
    overridden_by_user_id: null,
    overridden_at: null,
    phase: { type: 'KNOCKOUT' },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// admin.checkAccess — the ONE exception: never {ok:false}, callable by
// non-admins too, the interesting information IS the boolean.
// ---------------------------------------------------------------------------
describe('admin.checkAccess', () => {
  it('returns { isAdmin: true } for an admin caller, never an {ok:false} shape', async () => {
    requireAdminMock.mockResolvedValue(true);
    const result = await handlers['admin.checkAccess'](auth(), {});
    expect(result).toEqual({ isAdmin: true });
  });

  it('returns { isAdmin: false } for a non-admin caller — still callable, still no {ok:false}', async () => {
    requireAdminMock.mockResolvedValue(false);
    const result = await handlers['admin.checkAccess'](auth(), {});
    expect(result).toEqual({ isAdmin: false });
  });
});

// ---------------------------------------------------------------------------
// THE single most important authorization regression test in this bolt
// (design.md §14): every one of these five handlers must return FORBIDDEN
// for a non-admin caller, before touching prisma at all.
// ---------------------------------------------------------------------------
describe('FORBIDDEN for a non-admin caller — every admin.* handler except checkAccess', () => {
  beforeEach(() => {
    requireAdminMock.mockResolvedValue(false);
  });

  it('admin.getScoringSweepStatus rejects a non-admin caller', async () => {
    const result = await handlers['admin.getScoringSweepStatus'](auth(), {});
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('admin.triggerScoringSweep rejects a non-admin caller and never runs the sweep', async () => {
    const result = await handlers['admin.triggerScoringSweep'](auth(), {});
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(sweepFinishedUnscoredMatchesMock).not.toHaveBeenCalled();
  });

  it('admin.listMatches rejects a non-admin caller and never queries prisma', async () => {
    const result = await handlers['admin.listMatches'](auth(), {});
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(prismaMock.match.findMany).not.toHaveBeenCalled();
  });

  it('admin.forceMatchResult rejects a non-admin caller and never touches the match', async () => {
    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'm1',
      homeScore: 2,
      awayScore: 1,
      reason: 'because',
    });
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(prismaMock.match.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.match.update).not.toHaveBeenCalled();
    expect(scoreMatchMock).not.toHaveBeenCalled();
  });

  it('admin.revertMatchOverride rejects a non-admin caller and never touches the match', async () => {
    const result = await handlers['admin.revertMatchOverride'](auth(), { matchId: 'm1' });
    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(prismaMock.match.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.match.update).not.toHaveBeenCalled();
    expect(scoreMatchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// admin.getScoringSweepStatus / admin.triggerScoringSweep — admin-caller
// happy paths, proving the handler/tracker wiring for real (sweep-status.ts
// is NOT mocked in this suite).
// ---------------------------------------------------------------------------
describe('admin.getScoringSweepStatus / admin.triggerScoringSweep (admin caller)', () => {
  beforeEach(() => {
    requireAdminMock.mockResolvedValue(true);
  });

  it('getScoringSweepStatus reflects whatever the tracker last recorded, regardless of which caller triggered it', async () => {
    const at = new Date('2026-07-07T09:00:00.000Z');
    recordSweepRun(7, at);

    const result = await handlers['admin.getScoringSweepStatus'](auth(), {});
    expect(result).toEqual({ ok: true, lastRunAt: at.toISOString(), lastSweptCount: 7 });
  });

  it('triggerScoringSweep calls the real sweep function and returns its count', async () => {
    sweepFinishedUnscoredMatchesMock.mockResolvedValue(3);

    const result = (await handlers['admin.triggerScoringSweep'](auth(), {})) as { ok: true; sweptCount: number };
    expect(sweepFinishedUnscoredMatchesMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.sweptCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// admin.forceMatchResult — BR-7.16 mismatch + knockout/non-knockout winner
// resolution (admin caller throughout).
// ---------------------------------------------------------------------------
describe('admin.forceMatchResult (admin caller)', () => {
  beforeEach(() => {
    requireAdminMock.mockResolvedValue(true);
  });

  it('NOT_FOUND when the match does not exist', async () => {
    prismaMock.match.findUnique.mockResolvedValue(null);
    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'missing',
      homeScore: 1,
      awayScore: 0,
      reason: 'because',
    });
    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('TEAMS_NOT_RESOLVED (BR-7.4) when either team is an unresolved knockout placeholder', async () => {
    prismaMock.match.findUnique.mockResolvedValue(knockoutMatch({ awayTeamId: null }));
    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'm1',
      homeScore: 1,
      awayScore: 0,
      reason: 'because',
    });
    expect(result).toEqual({ ok: false, error: 'TEAMS_NOT_RESOLVED' });
    expect(prismaMock.match.update).not.toHaveBeenCalled();
  });

  it('BR-7.16 REGRESSION: rejects a submitted penaltyWinnerTeamId that contradicts the entered shootout score', async () => {
    prismaMock.match.findUnique.mockResolvedValue(knockoutMatch());

    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'm1',
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 5,
      awayPenaltyScore: 3, // derives 'home' as the true shootout winner
      penaltyWinnerTeamId: 't-away', // contradicts the derived winner
      reason: 'forced after full-time',
    });

    expect(result).toEqual({ ok: false, error: 'PENALTY_WINNER_MISMATCH' });
    expect(prismaMock.match.update).not.toHaveBeenCalled();
    expect(scoreMatchMock).not.toHaveBeenCalled();
  });

  it('a tied KNOCKOUT match falls back to the (validated) penaltyWinnerTeamId as the resolved winner', async () => {
    prismaMock.match.findUnique.mockResolvedValue(knockoutMatch());
    prismaMock.match.update.mockResolvedValue({});
    scoreMatchMock.mockResolvedValue(undefined);

    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'm1',
      homeScore: 2,
      awayScore: 2,
      homePenaltyScore: 5,
      awayPenaltyScore: 3, // derives 'home', matches the submitted winner below
      penaltyWinnerTeamId: 't-home',
      reason: 'forced after shootout',
    });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        homeScore: 2,
        awayScore: 2,
        homePenaltyScore: 5,
        awayPenaltyScore: 3,
        winnerTeamId: 't-home',
        status: 'FINISHED',
        manual_override: true,
        manual_override_reason: 'forced after shootout',
        overridden_by_user_id: 'user-1',
      }),
    });
    expect(scoreMatchMock).toHaveBeenCalledWith('m1');
  });

  it('a tied NON-KNOCKOUT match is a real draw — no penalty fallback, winnerTeamId stays null', async () => {
    prismaMock.match.findUnique.mockResolvedValue(knockoutMatch({ phase: { type: 'GROUP' } }));
    prismaMock.match.update.mockResolvedValue({});
    scoreMatchMock.mockResolvedValue(undefined);

    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'm1',
      homeScore: 1,
      awayScore: 1,
      reason: 'forced group-stage draw',
    });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        homeScore: 1,
        awayScore: 1,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamId: null,
        status: 'FINISHED',
      }),
    });
    expect(scoreMatchMock).toHaveBeenCalledWith('m1');
  });

  it('a decisive (non-tied) score resolves the winner from the score comparison alone, ignoring isKnockout', async () => {
    prismaMock.match.findUnique.mockResolvedValue(knockoutMatch({ phase: { type: 'GROUP' } }));
    prismaMock.match.update.mockResolvedValue({});
    scoreMatchMock.mockResolvedValue(undefined);

    const result = await handlers['admin.forceMatchResult'](auth(), {
      matchId: 'm1',
      homeScore: 3,
      awayScore: 1,
      reason: 'forced decisive result',
    });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.match.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ winnerTeamId: 't-home' }) }),
    );
  });
});

// ---------------------------------------------------------------------------
// admin.revertMatchOverride — NOT_OVERRIDDEN rejection + the reset-then-
// rescore call sequence (the actual delete-vs-recompute branch lives inside
// `scoreMatch`/`isMatchScoreable`, Bolt 10, unchanged — proven via the real
// curl+DB pass, not re-derived here).
// ---------------------------------------------------------------------------
describe('admin.revertMatchOverride (admin caller)', () => {
  beforeEach(() => {
    requireAdminMock.mockResolvedValue(true);
  });

  it('NOT_FOUND when the match does not exist', async () => {
    prismaMock.match.findUnique.mockResolvedValue(null);
    const result = await handlers['admin.revertMatchOverride'](auth(), { matchId: 'missing' });
    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('NOT_OVERRIDDEN when the match has no active manual override', async () => {
    prismaMock.match.findUnique.mockResolvedValue(knockoutMatch({ manual_override: false }));
    const result = await handlers['admin.revertMatchOverride'](auth(), { matchId: 'm1' });
    expect(result).toEqual({ ok: false, error: 'NOT_OVERRIDDEN' });
    expect(prismaMock.match.update).not.toHaveBeenCalled();
    expect(scoreMatchMock).not.toHaveBeenCalled();
  });

  it('resets every override/audit field and re-invokes scoreMatch (which deletes, not recomputes, since the match is no longer scoreable)', async () => {
    prismaMock.match.findUnique.mockResolvedValue(
      knockoutMatch({
        manual_override: true,
        manual_override_reason: 'earlier forced result',
        overridden_by_user_id: 'admin-1',
        overridden_at: new Date('2026-07-01T00:00:00.000Z'),
        homeScore: 2,
        awayScore: 2,
        winnerTeamId: 't-home',
        status: 'FINISHED',
      }),
    );
    prismaMock.match.update.mockResolvedValue({});
    scoreMatchMock.mockResolvedValue(undefined);

    const result = await handlers['admin.revertMatchOverride'](auth(), { matchId: 'm1' });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: {
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamId: null,
        status: 'SCHEDULED',
        manual_override: false,
        manual_override_reason: null,
        overridden_by_user_id: null,
        overridden_at: null,
      },
    });
    // scoreMatch is called AFTER the reset — its own not-scoreable branch
    // (status back to SCHEDULED) is what performs the delete, unchanged
    // since Bolt 10 (verified for real against the live DB, see
    // implement-and-test.md).
    expect(scoreMatchMock).toHaveBeenCalledWith('m1');
  });
});
