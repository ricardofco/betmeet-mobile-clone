# ADR-051 — Backend gets its own `computeScore` port; a "twin invariant" alongside ADR-016

## Status
Accepted (2026-07-06).

## Context

`backend/` is a fully standalone Node/Express service — its own
`package.json`, its own `tsconfig.json` with `rootDir: "src"` — connected to
the mobile app only via the `${baseUrl}/${capability}` HTTP contract
(ADR-026). It **cannot** import `src/shared/scoring/compute-score.ts`
without breaking that `rootDir` boundary; there is no code-sharing mechanism
between the two TypeScript projects (and per `requirements.md §7`/ADR-030,
none is meant to exist — "no code dependency on `betmeet-clone`" and, since
ADR-030, every backend business rule to date has been "reimplemented fresh
against the spec, never imported from mobile `src/`": invite-token
generation, permission checks, anti-bias masking, dual-save atomicity).

RANKINGS-4's score-persistence path (`scoreMatch`) and RANKINGS-3's
live-projection aggregation (`design.md §4.3.1`) both need to run
`computeScore`-equivalent logic **backend-side**, across every user's
prediction for a match — not client-side, since live projection must never
expose one user's raw predicted scoreline to another user's client
(`design.md §4.1`'s disclosure-surface note, mirroring ADR-038's masking
precedent). Following ADR-030's already-established convention, this bolt's
`backend/src/services/scoring/compute-score.ts` is a fresh, independent port
of the same algorithm — not a new precedent, the same one every prior
backend bolt already used.

**The tension, flagged explicitly rather than silently worked around**
(`design.md §5`): `src/shared/scoring/compute-score.ts`'s own doc comment
(ADR-016, SCORING-2's acceptance criteria) states an explicit invariant:
*"no other unit may define its own... computeScore-equivalent function"* —
enforced via a JSDoc `@invariant` comment plus a code-review checklist
applied at Bolt 6/9/11/12 PR review (ADR-016's own review-gate list, notably
**written before this repo had a `backend/` project at all** — it names only
mobile-side consumer bolts). This is the **first time** the specific
algorithm ADR-016 named as a single-source invariant genuinely needs a
second, physically separate implementation — not a violation Bolt 6/9/11/12
could have introduced by accident (those are all mobile-side, subject to
ADR-016's existing gate), but a new, previously-unanticipated case ADR-016's
review gate doesn't cover at all: a *different* TypeScript project that
structurally cannot import the shared module in the first place.

## Decision

`backend/src/services/scoring/compute-score.ts` is a fresh, independent port
of `src/shared/scoring/compute-score.ts`'s algorithm, reimplemented against
the same spec (`domain-overview.md §5.5`, the mobile file's own doc comments)
— following ADR-030's convention exactly, not a new one.

This creates a **"twin invariant"** alongside ADR-016's original one:

1. Both files' doc comments must cross-reference each other by path: the
   mobile `src/shared/scoring/compute-score.ts` gains a note pointing at
   `backend/src/services/scoring/compute-score.ts` (and this ADR), and the
   backend file gains a note pointing back at ADR-016 (and this ADR).
2. Any future change to the scoring rules (a new bonus type, a changed point
   value, a new tie condition) must touch **both** implementations in the
   same PR — not just the mobile one. This is a manual-discipline
   requirement (same enforcement class as ADR-016's own: no new tooling,
   an ADR-recorded review gate + discoverable doc comments), extended here to
   span two physically separate TypeScript projects instead of one.
3. **Verification mechanism**: a shared, explicit fixture-based test-case
   list (not a shared TS module — the whole point is these are two separate
   implementations) is maintained and referenced by both test suites, so a
   change to one implementation's test fixtures without a corresponding
   change to the other's is visible at Test-stage review time. `design.md
   §11` already names the headline regression case both suites must
   independently cover: the tied-live-match, differing-`penaltyWinnerTeamId`-
   picks case (model.md §4 point 5) — both users must get identical
   `projectedPoints`, no bonus to either, while `LIVE`.
4. **ADR-016 itself is updated** (see below) to add a forward-reference to
   this ADR, rather than leaving it silently contradicted by a second
   `computeScore`-equivalent function appearing in the codebase with no
   record of why that's now acceptable.

## Consequences

- `backend/src/services/scoring/compute-score.ts` and
  `src/shared/scoring/compute-score.ts` are two separate, independently
  maintained files implementing the same algorithm — a real, accepted
  maintenance cost (every scoring-rule change is now a two-file change, not
  one), justified by the `rootDir`/no-cross-project-import boundary being a
  harder constraint than the single-source-of-truth convenience ADR-016
  originally optimized for.
- If this maintenance cost becomes a recurring source of drift (a future
  scoring-rule change lands in one file but not the other), the fix is a
  process one (stricter PR-review checklist enforcement, or an automated
  fixture-diff check comparing both test suites' expected outputs for the
  same shared input list) — not a retroactive attempt to make `backend/`
  import from mobile `src/`, which would violate ADR-026's architecture
  pivot and ADR-030's established convention.
- Test-stage for this bolt must include the fixture-based test-case list
  referenced above, run against **both** implementations, with an explicit
  cross-reference comment in each test file pointing at the other.
- No other current backend service function needs this same twin-invariant
  treatment — this is specific to `computeScore`, the one algorithm ADR-016
  named as a single-source invariant. Every other backend business rule
  ADR-030 already covers was never subject to a single-source invariant in
  the first place (they were mobile-domain functions with advisory-only
  client-side equivalents, e.g. ADR-023's kickoff-lock check, not a "no
  other unit may redefine this" rule).
