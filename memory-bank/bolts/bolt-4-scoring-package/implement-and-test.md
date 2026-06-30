# Bolt 4 — Scoring Package — Implement & Test

## Implementation Summary

### Source cross-check note

`domain-overview.md §5.5` and `betmeet-clone/src/features/scoring/compute-score.ts` + `scoring-rules.ts` are in full agreement — no ambiguity, no reconciliation required. The algorithm was ported verbatim (unlike Bolt 3's ADR-011 nickname-cooldown correction). All test cases are ported from betmeet-clone's verified Vitest suite.

---

### Files created

**`src/shared/scoring/scoring-rules.ts`**
- `ScoringRuleSet` constant object: `EXACT_SCORE=5`, `CORRECT_RESULT=2`, `PARTIAL_GOAL_COUNT=1`, `MISS=0`, `PENALTY_BONUS=1`
- `@invariant` JSDoc comment (ADR-016 enforcement mechanism — makes the "no duplicate constants" rule discoverable at the source level)

**`src/shared/scoring/compute-score.ts`**
- `MatchedCase` union type: `'EXACT' | 'RESULT' | 'PARTIAL' | 'MISS'`
- `PenaltyWinner` type: `'home' | 'away' | null`
- `ScoringExample` interface (input)
- `ScoreBreakdown` interface (output, including optional `components` breakdown)
- `derivePenaltyWinner(homeShootoutGoals, awayShootoutGoals): PenaltyWinner` — the only valid source of a penalty winner; returns `null` for tied shootout
- `computeScore(example: ScoringExample): ScoreBreakdown` — three-step algorithm: exact-match short-circuit → additive components → independent penalty bonus
- `@invariant` JSDoc comment (ADR-016)

**`src/shared/scoring/index.ts`**
- Barrel re-export of all public API. Consumers import via `@/shared/scoring`.

---

### No config changes

- `rspack.config.mjs` and `rspack.config.education-remote.mjs` — unchanged (ADR-015: `scoring` is not registered in the MF `shared` config; the single-source guarantee is structural for a stateless pure-function module).
- `jest.config.js` — unchanged (no new native modules, no new npm packages).
- `tsconfig.json` — unchanged (`@` alias already resolves to `src/`).
- No new npm dependencies.

---

## Layer 1 — Test Results

**229 tests passing across 30 suites** (up from 202/28 after Bolt 3). 27 new tests across 2 new suites:

| Suite | Tests | Focus |
|---|---|---|
| `scoring-rules.test.ts` | 7 | Point constant values pinned; max-total relations verified |
| `compute-score.test.ts` | 20 | Full algorithm: EXACT short-circuit, RESULT+0/1 goal variants, correct draw, PARTIAL home/away, MISS, `explanationKey` invariant, 6 penalty-bonus cases, 4 `derivePenaltyWinner` cases |

`yarn tsc --noEmit` — clean.
`yarn lint` — 1 pre-existing error in `src/platform/supabase/supabase-adapter.ts` (Bolt 2 code, `'error' is defined but never used` — not touched by this bolt, same as Bolt 3's report).

---

## Layer 2 — Device Verification

**Deferred to manual verification by user**, per standing project convention (Bolt 0/1/2/3 precedent) — not invoked via `agent-device` in this session.

### Why Layer 2 matters less for this bolt

The scoring package is pure TypeScript with no native modules, no UI, and no network calls. There is no device-surface behavior to observe directly. The suggested manual test paths below are therefore integration-level checks — verifying that a consuming screen correctly calls the package and displays the output — rather than any device-level behavior intrinsic to the package itself.

### Prerequisites

No `pod install` required — no new native packages added by this bolt.

### Suggested manual Layer 2 test paths

These paths require Bolt 6 (Predictions core) or Bolt 9 (Scoring & Rankings) to be implemented, as those are the first consuming screens.

1. **Prediction form score preview (Bolt 6 dependency):** Enter a predicted score in the prediction form → confirm the live score-breakdown preview (educational calculator component, `unit-09-education`) shows the correct point total using the values from `ScoringRuleSet`. Verify EXACT(5), RESULT(2–3), PARTIAL(1), and MISS(0) cases each render the expected label and point count.

2. **Penalty winner slot (Bolt 6 dependency):** For a knockout match prediction form with a tied predicted score — confirm the penalty-winner selector appears; confirm selecting a winner and submitting sends a `predictedPenaltyWinner` value that was produced by `derivePenaltyWinner`, not a raw input; confirm a non-tied predicted score hides the selector.

3. **Rankings points display (Bolt 9 dependency):** After a match result is scored — confirm the leaderboard rows show the correct total points for each user's prediction, consistent with `computeScore`'s output for that match.

4. **Education calculator (Bolt 11 dependency):** On the Rules Center's "try it yourself" calculator — confirm that the point breakdown displayed for any combination of predicted/actual scores matches `computeScore`'s output exactly. This is the most direct test of the SCORING-2 single-source invariant on-device.

---

## Known Issues / Deferred

- None specific to this bolt. The package is complete and self-contained.
- The pre-existing lint error in `supabase-adapter.ts` (Bolt 2) is tracked in `activeContext.md` and `progress.md` — not introduced or worsened by this bolt.
- Layer 2 paths 1–4 above are all blocked on future bolts (6, 9, 11) rather than any outstanding work in this bolt.
