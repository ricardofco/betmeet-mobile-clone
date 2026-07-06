# ADR-016 — Duplicate-implementation detection for the scoring algorithm

## Context

SCORING-2's acceptance criteria require: "A code-level check (lint rule, import-boundary check, or simply an ADR-recorded review gate — mechanism is Construction's call) exists to catch a future accidental duplicate implementation."

The risk: a future bolt (Bolt 6 Predictions, Bolt 9 Rankings, Bolt 11 Education) could accidentally define its own local `EXACT_SCORE`/`CORRECT_RESULT`/`PARTIAL_GOAL_COUNT`/`PENALTY_BONUS` constants or its own `computeScore`-equivalent function rather than importing from `@/shared/scoring`. This is exactly the divergence the web app's `BR-2.7` invariant was designed to prevent, and it was preserved by having both the scoring engine and the educational calculator import `ScoringRuleSet` rather than each declaring their own constants.

Three enforcement options were considered:

1. **`eslint-plugin-boundaries`** — enforces import-direction rules between layers but cannot detect a forbidden re-declaration of a specific constant or function within a layer.
2. **ESLint `no-restricted-imports` + `no-restricted-syntax`** — `no-restricted-imports` could flag any import of a local scoring-shaped module that is not `@/shared/scoring`, but would not catch a copy-pasted inline definition.
3. **ADR-recorded review gate + canonical law-of-the-land JSDoc comment in the source file** — a code-review checklist item ("does this bolt introduce any point-value constant or score-computation function outside `@/shared/scoring`?") backed by a prominent comment in `scoring-rules.ts` and `compute-score.ts` making the invariant discoverable to any developer reading those files.

The project currently has no `eslint-plugin-boundaries` and adding it solely for one invariant would be scope creep (same reasoning as ADR-001's "enforcing dependency direction is currently a code-review discipline"). Options 1 and 2 are deferred to a future tooling ADR if violations become frequent.

## Decision

The duplicate-detection gate is:

1. **This ADR** — recorded in `memory-bank/bolts/bolt-4-scoring-package/`, discoverable by any agent or developer reading the bolt artifacts.
2. **A `@invariant` JSDoc comment** at the top of `src/shared/scoring/scoring-rules.ts` and `src/shared/scoring/compute-score.ts` stating the invariant in plain language (same approach as betmeet-clone's `BR-2.7` comment: "neither unit defines its own constants; both import this module so education and real scoring can never diverge").
3. **A code-review checklist item** (documented here, to be applied when reviewing PRs for Bolt 6, 9, 11, and 12 — the consumers of this package): reject any PR that introduces a local point-value constant (`EXACT_SCORE`, `CORRECT_RESULT`, `PARTIAL_GOAL_COUNT`, `PENALTY_BONUS`) or a local score-computation function, anywhere other than `src/shared/scoring/`.

This satisfies SCORING-2's AC ("mechanism is Construction's call") — the ADR-recorded review gate is the explicitly listed acceptable mechanism.

## Consequences

- Zero new tooling dependencies introduced.
- The invariant is discoverable at the source level (JSDoc) and at the architecture level (this ADR).
- If a future bolt violates the rule, the ADR provides the documented ground for a PR rejection.
- If violations become frequent enough to warrant automated enforcement, a follow-up ADR should introduce `eslint-plugin-boundaries` or a custom `no-restricted-syntax` rule — that decision is deferred, not pre-empted.

**Update (Bolt 10, 2026-07-06) — see `bolt-10-scoring-rankings/adr-051-backend-computescore-port-twin-invariant.md`.**
This ADR's review gate was written before this repo had a `backend/`
project and names only mobile-side consumer bolts (6, 9, 11, 12) — it did
not anticipate a case where a *different, structurally separate* TypeScript
project (own `tsconfig`/`rootDir`, no import path to
`src/shared/scoring/`) needs the same algorithm. Bolt 10 is that case:
`backend/src/services/scoring/compute-score.ts` is a fresh, independent
backend-side port, not a violation of this ADR's original intent (no
mobile-side unit defined a local duplicate) but a genuinely new instance of
"more than one implementation of this algorithm now exists in this repo."
ADR-051 records this as a **"twin invariant"**: both files' doc comments
cross-reference each other and this ADR, and any future scoring-rule change
must update both implementations together, verified via a shared
fixture-based test-case list. This ADR is not superseded — its original
mobile-side rule (no mobile unit outside `src/shared/scoring/` may define
its own `computeScore`-equivalent) still stands unchanged; ADR-051 only adds
the backend-side twin.

## Review gate (to be applied at Bolt 6, 9, 11, 12 PR review)

When reviewing any PR for a bolt that consumes the scoring package, verify:

- [ ] No local `EXACT_SCORE`, `CORRECT_RESULT`, `PARTIAL_GOAL_COUNT`, `MISS`, or `PENALTY_BONUS` constant is defined anywhere in the PR diff.
- [ ] No function that accepts predicted/actual score values and returns a point total is defined anywhere in the PR diff outside `src/shared/scoring/`.
- [ ] Any scoring-related import in the PR diff resolves to `@/shared/scoring`.
