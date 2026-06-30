import { computeScore, derivePenaltyWinner } from '@/shared/scoring/compute-score';
import { ScoringRuleSet } from '@/shared/scoring/scoring-rules';
import type { ScoringExample } from '@/shared/scoring/compute-score';

/**
 * Full test suite for `computeScore` and `derivePenaltyWinner`.
 *
 * All cases are ported from betmeet-clone's verified Vitest suite
 * (`src/features/scoring/__tests__/compute-score.test.ts`) — the authoritative
 * reference per unit-03-scoring/unit-brief.md. Porting is syntax-only
 * (Vitest → Jest globals); logic and assertions are identical.
 *
 * References: domain-overview.md §5.5, BR-2.1..BR-2.6, BR-36.2, FR-REFINE-14.4.
 */

// ---------------------------------------------------------------------------
// Test factory — mirrors betmeet-clone's `example()` helper
// ---------------------------------------------------------------------------

function example(overrides: Partial<ScoringExample> = {}): ScoringExample {
  return {
    predictedHome: 0,
    predictedAway: 0,
    actualHome: 0,
    actualAway: 0,
    isKnockout: false,
    predictedPenaltyWinner: null,
    actualPenaltyWinner: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Base cases (BR-2.1..BR-2.4, BR-36)
// ---------------------------------------------------------------------------

describe('computeScore — base cases (BR-2.1..BR-2.4, BR-36)', () => {
  it('EXACT: exact score gives 5 with no component breakdown', () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe('EXACT');
    expect(b.basePoints).toBe(ScoringRuleSet.EXACT_SCORE);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE);
    expect(b.components).toBeUndefined();
  });

  it('RESULT + 0 goals: correct winner without any goal match gives 2', () => {
    const b = computeScore(
      example({ predictedHome: 3, predictedAway: 1, actualHome: 2, actualAway: 0 }),
    );
    expect(b.matchedCase).toBe('RESULT');
    expect(b.basePoints).toBe(2);
    expect(b.totalPoints).toBe(2);
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 0 });
  });

  it('RESULT + 1 away goal: correct winner plus matched away goal gives 3 (BR-36.2)', () => {
    const b = computeScore(
      example({ predictedHome: 3, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe('RESULT');
    expect(b.basePoints).toBe(3);
    expect(b.totalPoints).toBe(3);
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 1 });
  });

  it('RESULT + 1 home goal: correct winner plus matched home goal gives 3 (BR-36.2)', () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 0, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe('RESULT');
    expect(b.basePoints).toBe(3);
    expect(b.totalPoints).toBe(3);
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 1, awayGoalPoints: 0 });
  });

  it('matching both goal counts AND result is EXACT (short-circuit fires — max non-exact cannot be 4)', () => {
    // If both sides match AND result matches → exact score → caught by step 1.
    // This test confirms the short-circuit invariant: there is no case where
    // result(2) + home(1) + away(1) = 4 because that combination is EXACT(5).
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe('EXACT');
    expect(b.basePoints).toBe(5);
    expect(b.components).toBeUndefined();
  });

  it('correct draw without exact score gives 2 (result points only)', () => {
    const b = computeScore(
      example({ predictedHome: 1, predictedAway: 1, actualHome: 2, actualAway: 2 }),
    );
    expect(b.matchedCase).toBe('RESULT');
    expect(b.basePoints).toBe(2);
    expect(b.totalPoints).toBe(2);
    expect(b.components?.resultPoints).toBe(2);
    expect(b.components?.homeGoalPoints).toBe(0);
    expect(b.components?.awayGoalPoints).toBe(0);
  });

  it('PARTIAL: one home goal matched, wrong result gives 1', () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 0, actualHome: 2, actualAway: 3 }),
    );
    expect(b.matchedCase).toBe('PARTIAL');
    expect(b.basePoints).toBe(1);
    expect(b.totalPoints).toBe(1);
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 1, awayGoalPoints: 0 });
  });

  it('PARTIAL: one away goal matched, wrong result gives 1', () => {
    const b = computeScore(
      example({ predictedHome: 3, predictedAway: 2, actualHome: 0, actualAway: 2 }),
    );
    expect(b.matchedCase).toBe('PARTIAL');
    expect(b.basePoints).toBe(1);
    expect(b.totalPoints).toBe(1);
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 0, awayGoalPoints: 1 });
  });

  it('MISS: nothing right gives 0', () => {
    const b = computeScore(
      example({ predictedHome: 0, predictedAway: 0, actualHome: 1, actualAway: 3 }),
    );
    expect(b.matchedCase).toBe('MISS');
    expect(b.basePoints).toBe(0);
    expect(b.totalPoints).toBe(0);
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 0, awayGoalPoints: 0 });
  });

  it('explanationKey equals matchedCase for every outcome', () => {
    const cases = [
      example({ predictedHome: 1, predictedAway: 1, actualHome: 1, actualAway: 1 }), // EXACT
      example({ predictedHome: 2, predictedAway: 0, actualHome: 1, actualAway: 0 }), // RESULT
      example({ predictedHome: 2, predictedAway: 0, actualHome: 2, actualAway: 3 }), // PARTIAL
      example({ predictedHome: 0, predictedAway: 0, actualHome: 1, actualAway: 3 }), // MISS
    ];
    for (const input of cases) {
      const b = computeScore(input);
      expect(b.explanationKey).toBe(b.matchedCase);
    }
  });
});

// ---------------------------------------------------------------------------
// Penalty bonus (BR-2.5, BR-2.6)
// ---------------------------------------------------------------------------

describe('computeScore — penalty bonus (BR-2.5, BR-2.6)', () => {
  it('adds +1 when knockout, tied score, and penalty winner predicted correctly (EXACT + bonus = 6)', () => {
    const b = computeScore(
      example({
        predictedHome: 1,
        predictedAway: 1,
        actualHome: 1,
        actualAway: 1,
        isKnockout: true,
        predictedPenaltyWinner: 'home',
        actualPenaltyWinner: 'home',
      }),
    );
    expect(b.penaltyApplied).toBe(true);
    expect(b.penaltyPoints).toBe(ScoringRuleSet.PENALTY_BONUS);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE + ScoringRuleSet.PENALTY_BONUS);
  });

  it('penalty bonus also applies on non-exact tie (e.g. RESULT 0-0 vs 1-1)', () => {
    const b = computeScore(
      example({
        predictedHome: 0,
        predictedAway: 0,
        actualHome: 1,
        actualAway: 1,
        isKnockout: true,
        predictedPenaltyWinner: 'away',
        actualPenaltyWinner: 'away',
      }),
    );
    expect(b.penaltyApplied).toBe(true);
    expect(b.matchedCase).toBe('RESULT');
    expect(b.totalPoints).toBe(2 + 1); // result(2) + penalty bonus(1)
  });

  it('no bonus when penalty winner predicted wrong', () => {
    const b = computeScore(
      example({
        predictedHome: 0,
        predictedAway: 0,
        actualHome: 0,
        actualAway: 0,
        isKnockout: true,
        predictedPenaltyWinner: 'away',
        actualPenaltyWinner: 'home',
      }),
    );
    expect(b.penaltyApplied).toBe(false);
    expect(b.penaltyPoints).toBe(0);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE);
  });

  it('no bonus when not knockout even if tied and winner matches', () => {
    const b = computeScore(
      example({
        predictedHome: 1,
        predictedAway: 1,
        actualHome: 1,
        actualAway: 1,
        isKnockout: false,
        predictedPenaltyWinner: 'home',
        actualPenaltyWinner: 'home',
      }),
    );
    expect(b.penaltyApplied).toBe(false);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE);
  });

  it('no bonus when actual score is not a draw (knockout match, clear winner)', () => {
    const b = computeScore(
      example({
        predictedHome: 2,
        predictedAway: 1,
        actualHome: 2,
        actualAway: 1,
        isKnockout: true,
        predictedPenaltyWinner: 'home',
        actualPenaltyWinner: 'home',
      }),
    );
    expect(b.penaltyApplied).toBe(false);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE);
  });

  it('no bonus when predictedPenaltyWinner is null (user did not predict a winner)', () => {
    const b = computeScore(
      example({
        predictedHome: 0,
        predictedAway: 0,
        actualHome: 0,
        actualAway: 0,
        isKnockout: true,
        predictedPenaltyWinner: null,
        actualPenaltyWinner: 'home',
      }),
    );
    expect(b.penaltyApplied).toBe(false);
    expect(b.penaltyPoints).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// derivePenaltyWinner (FR-REFINE-14.4)
// ---------------------------------------------------------------------------

describe('derivePenaltyWinner (FR-REFINE-14.4)', () => {
  it('derives home winner when home shootout goals exceed away', () => {
    expect(derivePenaltyWinner(4, 3)).toBe('home');
  });

  it('derives away winner when away shootout goals exceed home', () => {
    expect(derivePenaltyWinner(3, 5)).toBe('away');
  });

  it('returns null for an (invalid) tied shootout score', () => {
    expect(derivePenaltyWinner(3, 3)).toBeNull();
  });

  it('returns null for 0-0 shootout (edge: no goals taken)', () => {
    expect(derivePenaltyWinner(0, 0)).toBeNull();
  });
});
