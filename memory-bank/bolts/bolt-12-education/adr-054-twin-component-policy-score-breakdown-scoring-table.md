# ADR-054 — Twin-component policy applied to Education: `ScoreBreakdownPanel`/`ScoreBreakdownExplainer` and `ScoringTable`/`OnboardingScoringSummary` stay independent implementations

## Status
Accepted (2026-07-06).

## Context

`betmeet-clone`'s Education feature (source of `education ───→ scoring`'s
sibling edge, `predictions ───→ education`, `domain-overview.md §7 line 201`)
has a single physical `ScoreBreakdownExplainer` component that both
`education` and `predictions` import — one owner, two importers, since both
features live in the same web bundle.

In this mobile repo, that ordering is **inverted by construction**
(`model.md §8`): Bolt 6 (Predictions, host-placed) shipped its own
`src/host/predictions/components/score-breakdown-panel.tsx` months before
Education had any real content at all (this bolt is the first time Education
gets real content). `ScoreBreakdownPanel` is presentational, reads a
`ScoreBreakdown`, and renders matched-case/points/penalty-bonus — functionally
equivalent to `betmeet-clone`'s `ScoreBreakdownExplainer`, but a **second,
independently-written implementation**, not an import of a shared component;
it already has its own tests (Bolt 6) and its own consumer
(`PredictionsFixtureList`, extended again in Bolt 10 for the Scored/Pending
badge). Critically, the two modules sit on **opposite sides of a Module
Federation boundary** (host vs. remote), so `betmeet-clone`'s literal
"one component, two importers" shape is not straightforwardly achievable here
— a host component importing from a not-yet-loaded remote bundle (or vice
versa) is a materially different problem than two same-bundle imports.

This tension was flagged, not silently resolved, at Model stage (`model.md
§8`/`§10` item 3) and **checkpoint-resolved before Design started**
(`design.md`'s header note): keep both as intentional twins. Design then
found the identical shape appear a second time, independently, and not
originally flagged by Model: EDU-2's calculator-fallback `scoring-table.tsx`
(remote) and EDU-3's onboarding `onboarding-scoring-summary.tsx` (host) both
render the same 5-row rule→points list from the same `ScoringRuleSet`
constants (`design.md §7`).

Both cases are structurally the same class of decision Bolt 10 already made
for a **different layer** (backend vs. mobile, not host vs. remote):
ADR-051 records that `backend/src/services/scoring/compute-score.ts` and
`src/shared/scoring/compute-score.ts` are independent ports of the same
algorithm because the backend cannot import mobile's `src/shared/scoring/`
across its `rootDir` boundary. This ADR is the presentation-layer analogue —
two components on opposite sides of an MF boundary, rather than two
functions on opposite sides of a `rootDir` boundary — but the underlying
justification is identical: the numbers/data can never drift because both
sides consume the exact same single-source data (`ScoreBreakdown` from
`computeScore()`, or the same `ScoringRuleSet` constants), so a second
physical implementation of the *presentation* is an accepted cost, not a
correctness risk.

## Decision

Both pairs stay as **independent twins**, no shared cross-boundary component
tier is created:

1. **`ScoreBreakdownPanel`** (host, `src/host/predictions/components/`) and
   **`ScoreBreakdownExplainer`** (education remote,
   `src/remotes/education/components/score-breakdown-explainer.tsx`) — both
   consume the exact same `ScoreBreakdown` shape from the exact same
   `computeScore()` (`@/shared/scoring`, ADR-015/ADR-016), so the *numbers*
   can never drift; only the small presentational shells differ (education's
   is richer, mirroring `betmeet-clone`'s own `ScoreBreakdownExplainer` with
   separate `resultPoints`/`homeGoalPoints`/`awayGoalPoints` rows when not
   `EXACT`).
2. **`ScoringTable`** (education remote,
   `src/remotes/education/components/scoring-table.tsx`, EDU-2's calculator
   fallback) and **`OnboardingScoringSummary`** (host,
   `src/host/profile/components/onboarding-scoring-summary.tsx`, EDU-3) —
   both render the same 5-row rule→points list from the same
   `ScoringRuleSet` constants and the same `scoring.*` i18n keys, each
   independently rendered inside its own bundle, no cross-boundary import.

Neither case is an ADR-016-style "duplicate scoring *math*" violation — no
component in either pair recomputes points or rules; both always read from
the single-source `ScoringRuleSet`/`computeScore()` (ADR-015/016). This is a
duplicate-*presentation-component* situation only, and is explicitly **not**
subject to ADR-016's `computeScore`-equivalent invariant or its code-review
gate — that gate covers scoring-algorithm reimplementation, not UI shells
that read the algorithm's output.

## Consequences

- No new `src/shared/education/`-or-similar cross-boundary presentational
  component tier is created for either pair. If a third instance of this
  same shape appears in a future bolt (e.g., Bolt 13/Admin needing its own
  score-breakdown display), this ADR's reasoning applies again by default —
  re-examine only if a real render-blocking or maintenance-cost signal
  appears, not preemptively.
- Both `ScoringTable` and `OnboardingScoringSummary` (and both
  `ScoreBreakdownPanel`/`ScoreBreakdownExplainer`) must be kept manually in
  visual/structural sync by convention (a PR touching one pair's presentation
  should prompt a look at its twin) — the same manual-discipline enforcement
  class ADR-051 already established for the backend `computeScore` twin, not
  a new tooling requirement.
- Test-stage for this bolt covers each twin's own presentational contract
  independently (RNTL component tests per `design.md §13`) — no shared test
  fixture list is required the way ADR-051 mandates for `computeScore`
  (these are presentational shells, not algorithms with numeric outputs that
  must match bit-for-bit across implementations); each twin only needs to
  prove it renders its own `ScoreBreakdown`/`ScoringRuleSet` input correctly.
- This is the first time this project's "independent twins" policy has been
  recorded as applying to **two separate component pairs** in one ADR,
  cross-referencing ADR-051 as the same-spirit precedent from a different
  layer (backend/mobile `rootDir` boundary vs. host/remote MF boundary) —
  future reviewers should read this ADR and ADR-051 together as the two
  instances of this project's general "boundary-crossing twin" pattern.
