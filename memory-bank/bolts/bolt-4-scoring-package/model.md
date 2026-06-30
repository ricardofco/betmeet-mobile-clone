# Bolt 4 — Scoring Package — Model

## Ubiquitous Language

| Term | Definition |
|---|---|
| **ScoringRuleSet** | The set of five named point constants (`EXACT_SCORE`, `CORRECT_RESULT`, `PARTIAL_GOAL_COUNT`, `MISS`, `PENALTY_BONUS`). Never defined more than once in the codebase — both the educational calculator and the rankings engine import this same object. |
| **ScoringExample** | The input to `computeScore`: the predicted score (home/away integers), the actual score (home/away integers), whether the match is a knockout, and optional predicted/actual penalty-shootout winners. |
| **ScoreBreakdown** | The output of `computeScore`: `matchedCase`, `basePoints`, `penaltyApplied`, `penaltyPoints`, `totalPoints`, `explanationKey`, and an optional `components` object detailing the additive sub-totals. |
| **MatchedCase** | One of `"EXACT" | "RESULT" | "PARTIAL" | "MISS"`. Used for i18n and UI rendering by consumers. |
| **PenaltyWinner** | `"home" | "away" | null`. The only valid source is `derivePenaltyWinner(homeShootoutGoals, awayShootoutGoals)` — never accepted as free user input. A tied shootout (home === away) maps to `null` (invalid state). |
| **basePoints** | Points from the main (non-penalty) part of the score. Either 5 (EXACT) or the additive total of result + goal-count components (0–3 for non-exact). |
| **penaltyPoints** | 0 or 1 — the bonus for correctly predicting the shootout winner. Independent of basePoints. |
| **totalPoints** | `basePoints + penaltyPoints`. Maximum = 6 (EXACT + penalty bonus). |
| **components** | Present only on non-EXACT results. Breaks down `resultPoints` (0 or 2), `homeGoalPoints` (0 or 1), `awayGoalPoints` (0 or 1). |

## Point Constants (from `domain-overview.md §5.5` and betmeet-clone's `scoring-rules.ts`)

| Constant | Value | Notes |
|---|---|---|
| `EXACT_SCORE` | 5 | Short-circuits — no component breakdown |
| `CORRECT_RESULT` | 2 | Win/draw/loss result correct; only on non-exact |
| `PARTIAL_GOAL_COUNT` | 1 | Per side, independently (home and away both can apply) |
| `MISS` | 0 | Nothing correct |
| `PENALTY_BONUS` | 1 | Knockout + tied regular/ET score + correct penalty winner |

## Algorithm Rules (verified against betmeet-clone's `compute-score.ts`)

1. **Exact match short-circuit:** if `predictedHome === actualHome` AND `predictedAway === actualAway` → `matchedCase = "EXACT"`, `basePoints = 5`. No components field. Done (step 2 is skipped entirely).

2. **Additive components (non-exact only):**
   - `resultPoints = predictedResult === actualResult ? 2 : 0`
     - Result is `sign(home - away)` → +1 (home win), 0 (draw), -1 (away win)
   - `homeGoalPoints = predictedHome === actualHome ? 1 : 0`
   - `awayGoalPoints = predictedAway === actualAway ? 1 : 0`
   - `basePoints = resultPoints + homeGoalPoints + awayGoalPoints`
   - `matchedCase`:
     - `resultPoints > 0` → `"RESULT"`
     - else `homeGoalPoints > 0 || awayGoalPoints > 0` → `"PARTIAL"`
     - else → `"MISS"`
   - Maximum non-exact `basePoints` is 3 (result:2 + one side:1). Having both goals and the result match implies exact score (5), which is caught by step 1.

3. **Penalty bonus (independent of step 1 and 2):**
   - Applies IFF: `isKnockout === true` AND `actualHome === actualAway` (tied at regular/ET) AND `predictedPenaltyWinner != null` AND `predictedPenaltyWinner === actualPenaltyWinner`
   - `penaltyPoints = 1`, `penaltyApplied = true`
   - Otherwise `penaltyPoints = 0`, `penaltyApplied = false`

4. **totalPoints = basePoints + penaltyPoints**

## Key Edge Cases (all verified in betmeet-clone's test suite)

| Scenario | Expected |
|---|---|
| 2-1 vs 2-1 (EXACT) | matchedCase=EXACT, total=5, no components |
| 3-1 vs 2-1 (result+away goal) | matchedCase=RESULT, basePoints=3, total=3 |
| 1-1 vs 2-2 (correct draw, non-exact) | matchedCase=RESULT, basePoints=2, total=2 |
| 2-0 vs 2-3 (home goal only, wrong result) | matchedCase=PARTIAL, basePoints=1, total=1 |
| 0-0 vs 1-3 (MISS) | matchedCase=MISS, basePoints=0, total=0 |
| KO 1-1 vs 1-1, home wins pens | matchedCase=EXACT, total=6 (5+1 penalty bonus) |
| KO 0-0 vs 0-0, away wins pens but predicted home | penaltyApplied=false, total=5 |
| KO 2-1 vs 2-1 (not tied), penalty fields present | penaltyApplied=false (no tie) |
| Group match 1-1 vs 1-1, penalty winner supplied | penaltyApplied=false (not knockout) |
| `derivePenaltyWinner(4,3)` | "home" |
| `derivePenaltyWinner(3,5)` | "away" |
| `derivePenaltyWinner(3,3)` | null (invalid tied shootout) |

## Source Cross-Check

`domain-overview.md §5.5` is fully consistent with `betmeet-clone/src/features/scoring/compute-score.ts` and `scoring-rules.ts`. No ambiguity or reconciliation required for this bolt (unlike Bolt 3's ADR-011). The algorithm is reproduced verbatim — no creative decisions made at model stage.
