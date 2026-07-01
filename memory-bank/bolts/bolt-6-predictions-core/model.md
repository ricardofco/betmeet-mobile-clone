# Bolt 6 — Model

This bolt covers **PREDICTIONS-1** (submit/edit a prediction, kickoff-lock
enforcement), **PREDICTIONS-2** (penalty-winner selector for tied knockout
matches), and **PREDICTIONS-5** (score-breakdown display, reusing Bolt 4's
`computeScore()`). Source: `bolt-plan.md`'s Bolt 6 section, cross-referenced
against `domain-overview.md §4.2`/`§5.4`/`§5.5` and `system-context.md §3`,
since the `units/unit-05-predictions/` story files referenced by the bolt
plan are not present in this repo (same gap as would apply to any other
bolt — Bolt 5's `model.md` hit the same thing and used the same
domain-overview.md/system-context.md fallback; no reconciliation was needed
here, the domain-overview.md prose is unambiguous, unlike Bolt 3's
ADR-011 case).

**PREDICTIONS-3/PREDICTIONS-4** (pool override + dual-save, reset override)
are explicitly **out of scope** — bolt-plan.md sequences those into Bolt 8
("predictions↔pools integration"), since they need Bolt 7's pools to exist
first. This bolt's `MyPrediction` type includes a `poolId: string | null`
field so Bolt 8 doesn't need to widen the shape later — but no override/
dual-save UI or logic is implemented here; every prediction this bolt saves
is a **global** prediction (`poolId: null`).

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Prediction** | A user's guess at a match's final score (`homeScore`/`awayScore`, 0–20 each), optionally with a penalty-winner pick. Global (`poolId = null`) in this bolt. |
| **Kickoff lock** | The moment a prediction becomes permanently uneditable — `now >= match.kickoffAt`. No grace period. |
| **Eligibility** | The result of evaluating whether a prediction can still be created/edited right now (`getPredictionEligibility`). Advisory client-side only. |
| **Penalty winner** | `'home' \| 'away' \| null`, always **derived** from a shootout score (`derivePenaltyWinner`, Bolt 4), never a raw independent choice. |
| **Tied knockout match** | A knockout-phase match whose predicted (or actual) regular/ET score is level — the only case where a penalty-winner pick is required (predictions) or meaningful (scoring). |
| **Score breakdown** | The `ScoreBreakdown` (`matchedCase`/`basePoints`/`penaltyApplied`/`penaltyPoints`/`totalPoints`) computed by Bolt 4's `computeScore()` for a finished match + the viewer's own prediction — explanatory only; the authoritative score is server-persisted. |

## 2. Kickoff-lock state machine (PREDICTIONS-1)

Ported verbatim from `domain-overview.md §4.2` (`getPredictionEligibility`),
same branch order as the backend:

```
no home/away team assigned       → not editable, reason MATCH_NOT_EDITABLE
no kickoff time                  → not editable, reason MATCH_NOT_EDITABLE
now >= kickoffAt                 → not editable, reason KICKOFF_REACHED   ← the lock cutoff, no grace period
status === CANCELLED             → not editable, reason CANCELLED
status === POSTPONED              → not editable, reason POSTPONED
status not SCHEDULED (other)     → not editable, reason MATCH_STATUS_LOCKED
otherwise (SCHEDULED, now < kickoffAt, both teams set) → editable
```

`getPredictionEligibility(match, now)` in `src/domain/predictions/prediction-eligibility.ts`
is a pure function — no hidden `Date.now()` (same discipline as Bolt 5's
`fixture-day-grouping.ts`). **This client-side copy is advisory only** — the
backend re-checks with its own clock on every save, and the
`prediction_lock_guard` Postgres trigger rejects any UPDATE to a locked
prediction's score fields independent of the application layer
(domain-overview.md §4.2, requirements.md §7's kickoff-lock guarantee). This
bolt's UI must never claim to be the actual gate — see ADR-023 for the
explicit review of this property (the bolt-plan's named risk).

A prediction is editable an **unlimited number of times** until the lock
cutoff (no per-day/per-hour edit limit) — there is no domain rule to encode
for this; it simply means the UI never needs an "edits remaining" counter.

## 3. Prediction entry validation (PREDICTIONS-1, PREDICTIONS-2)

`validatePredictionEntry(entry, isKnockout)` in
`src/domain/predictions/prediction-entry-validation.ts`:

- Score bounds: integers 0–20 per side (`domain-overview.md §5.4`). Enforced
  here for UX; the DB's `predictions_scores_range` CHECK is the real gate.
- Penalty-winner selector applies **only** to a tied knockout-phase match:
  - knockout **and** `homeScore === awayScore` → a `penaltyWinner` pick is
    **required** (`PENALTY_WINNER_REQUIRED` if missing).
  - otherwise, supplying a `penaltyWinner` is itself an error
    (`PENALTY_WINNER_NOT_APPLICABLE`) — mirrors "the server strips/rejects
    it" (domain-overview.md §5.4).
- `shouldShowPenaltyWinnerSelector(homeScore, awayScore, isKnockout)` is a
  separate, looser helper for **UI gating** (should the selector even
  render while the user is mid-entry) — kept distinct from full validation
  since the user may not have picked a winner yet while still typing scores.

The penalty winner itself is never a free-choice enum in this codebase —
`derivePenaltyWinner()` (Bolt 4's `@/shared/scoring`) is the only function
that produces one, from an actual shootout score. This domain module
re-exports it (not reimplements) so predictions-area code has one import
path for "pick a shootout winner," consistent with ADR-016's
duplicate-detection gate (checklist applied below).

## 4. Score-breakdown display (PREDICTIONS-5)

`src/domain/predictions/prediction-score-display.ts`:

- `canShowScoreBreakdown(match)` — gate: only `FINISHED` matches with both
  actual scores populated have a meaningful breakdown. `LIVE`-match
  projection is explicitly **out of scope** here (that is Bolt 9/Rankings'
  concern, domain-overview.md §5.6 — "no penalty bonus during live
  projection" is a *rankings* rule, not a predictions-screen rule).
- `buildScoreBreakdown(input)` — assembles Bolt 4's `ScoringExample` from a
  finished `Match` + the viewer's own `MyPrediction`, derives the actual
  penalty winner from the match's shootout score via the same
  `derivePenaltyWinner` Bolt 4 exports, and calls `computeScore()`. **Zero
  scoring math is reimplemented in this bolt** — this module is purely an
  adapter from "match + my prediction" shape to `computeScore`'s input
  shape.
- This client-side recomputation is **explanatory display only**; the
  authoritative persisted score is always the backend's `PredictionScore`
  row (system-context.md §3). No write path exists here — this is read-only
  display logic.

## 5. Data shapes

`src/domain/predictions/prediction-with-match.ts`:

- `MyPrediction` — `{ id, matchId, poolId, homeScore, awayScore, penaltyWinner }`.
  `poolId: string | null` included now (future-proofing for Bolt 8's
  override/dual-save) but never set to non-null by this bolt.
- `MatchWithMyPrediction` — `{ match: Match, prediction: MyPrediction | null, isKnockout: boolean }`,
  the mobile equivalent of the backend's `getFixtureWithMyPredictions` join
  (explicitly out of Bolt 5's scope per `competition-api.ts`'s own doc
  comment — this bolt is the first consumer to need the joined shape).

## 6. ADR-016 duplicate-detection checklist (applied here, scoring-adjacent)

Per ADR-016's three-item code-review gate, applied to this bolt's Model
stage:
1. No local `EXACT_SCORE`/`CORRECT_RESULT`/`PARTIAL_GOAL_COUNT`/`PENALTY_BONUS`
   constant is defined anywhere in `src/domain/predictions/` — confirmed by
   grep, zero hits.
2. No local `computeScore`-equivalent function exists — `prediction-score-
   display.ts` calls the one shared `computeScore` import, does not
   reimplement any branch of it.
3. `derivePenaltyWinner` is imported from `@/shared/scoring` and re-exported,
   never redefined — confirmed in `prediction-entry-validation.ts` and
   `prediction-score-display.ts`.

## 7. Explicitly out of scope (this bolt)

- PREDICTIONS-3 (pool override + dual-save) — Bolt 8.
- PREDICTIONS-4 (reset override) — Bolt 8.
- Live-match projected scoring — Bolt 9 (Rankings).
- Anti-bias masking of other members' predictions — Bolt 8/POOLS-6 (this
  bolt only ever shows the viewer's own prediction).
