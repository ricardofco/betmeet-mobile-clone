# Unit Brief — `unit-03-scoring`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Not a routed chunk — a shared pure library importable by the host and every remote (requirements.md §7.4).

## Purpose

Reimplement, inside this repo, the exact deterministic scoring algorithm from `betmeet-clone` — a pure, dependency-free function with no Prisma/network access — as mobile's own single source of truth, consumed identically by the predictions unit (real scoring display), the scoring-rankings unit (ranking computation context), and the education unit (the "try it yourself" calculator), so none of them can ever compute different point totals.

## Source rules

`domain-overview.md §5.5` (the algorithm, verbatim) and §7 (cross-feature dependency map: `scoring` is a true leaf, zero inward dependencies, the safest highest-value first slice — explicitly called out as the recommended starting point).

## In scope

- The point constants: `EXACT_SCORE = 5`, `CORRECT_RESULT = 2`, `PARTIAL_GOAL_COUNT = 1` (home/away independently), `MISS = 0`, `PENALTY_BONUS = 1`.
- The algorithm: exact-match short-circuit (5 pts, no component breakdown) vs. additive result/goal-count components; the independent penalty-shootout bonus (only for tied knockout matches, winner always derived from the shootout score, never taken as raw separate input).
- A test suite ported from the web app's own verified test-case table (`domain-overview.md §5.5`'s implicit cases, e.g. 2-1 vs 2-1 → EXACT/5; 3-1 vs 2-1 → RESULT/3; 0-0 vs 1-3 → MISS/0; tied knockout with correct penalty pick → EXACT+bonus/6).

## Out of scope

- Persisting scores (that's server-side, `unit-07-scoring-rankings`'s backend contract).
- Ranking/dense-rank computation (`unit-07-scoring-rankings`).
- Any UI (the calculator UI is `unit-09-education`; the in-context score display is `unit-05-predictions`/`unit-07-scoring-rankings`).

## Dependencies

- **Depends on:** nothing — true leaf, build any time, but recommended first since several other units consume it.
- **Depended on by:** `unit-05-predictions` (display), `unit-07-scoring-rankings` (ranking context), `unit-09-education` (interactive calculator), `unit-10-admin` (validating admin-entered penalty scores against the derived winner, mirroring the web app's admin use of `derivePenaltyWinner`).

## Native modules

None — pure TypeScript.

## Backend contract needed

None for the algorithm itself. (The *authoritative*, persisted score still comes from the backend per `system-context.md §3` — this package is for client-side display/preview parity, not as a replacement for server-side authority.)

## Unit-level acceptance criteria

- Every test case the web app's `compute-score.test.ts` verifies (per `domain-overview.md §5.5` and the underlying research) passes identically against this package's implementation.
- No other unit reimplements any part of this algorithm independently — code review/ADR should flag any duplicate point-math logic found elsewhere as a defect.

## Risks

None significant — this is the lowest-risk unit in the whole migration per `migration-analysis.md §4`.

## Stories

See `stories/`: SCORING-1, SCORING-2.
