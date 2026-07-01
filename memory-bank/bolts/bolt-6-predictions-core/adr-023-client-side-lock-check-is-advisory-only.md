# ADR-023 — Client-side kickoff-lock check is advisory-only, never the actual gate

## Context

PREDICTIONS-1's kickoff-lock rule is named as an explicit risk in
`bolt-plan.md`'s Bolt 6 section: "kickoff-lock correctness... deserve[s]
explicit review before sign-off, not just functional correctness." The
domain model (`domain-overview.md §4.2`) states the rule cannot be bypassed
by any client, by construction:

> The server re-checks this with **its own clock** on every save — the
> client's countdown UI is a courtesy, never authoritative. A Postgres
> trigger (`prediction_lock_guard`) additionally rejects any UPDATE to a
> locked prediction's score fields, independent of the application layer —
> this protection exists at the database level and any client (web or
> mobile) inherits it automatically if it talks to the same database.

`requirements.md §7` states the same guarantee at the inception level: "The
kickoff-lock business rule cannot be bypassed by the mobile client, by
construction (the same DB-level trigger backstop applies regardless of
which client mutates a prediction)."

## Decision

`getPredictionEligibility()` (`src/domain/predictions/prediction-
eligibility.ts`) is implemented as a verbatim, same-branch-order port of the
backend's own state machine, and is used **only** to:
1. Decide whether to render the score-input/penalty-selector UI at all
   (vs. a locked/read-only state with `describeLockReason()`'s copy).
2. Avoid firing a doomed save request the server would reject anyway.

It is **never** treated as the actual authorization boundary. Concretely:
- The save mutation (`predictionsApi.savePrediction`) is always sent through
  the backend API — never a direct Supabase write from mobile for the score
  fields themselves (the DB trigger is the real backstop, per
  `system-context.md §2`'s "Reserved for direct Supabase access" list,
  which explicitly names the kickoff-lock trigger as already
  backend-enforced regardless of caller).
- A save's failure response (post-lock rejection) is treated as an
  expected, handleable outcome, not an exceptional bug — the UI must
  gracefully show "this match has locked" if the client's clock was stale
  or skewed relative to the server's, not crash or show a generic error.
- No client-side attempt is made to "extend" editability past what the
  server allows (e.g. no optimistic-save-then-rollback-only-on-error
  pattern that could visually imply a save succeeded before the server
  confirms it did).

## Consequences

- **Positive**: the mobile client cannot regress or weaken the kickoff-lock
  guarantee even if the client-side port has a bug — worst case, a UI
  incorrectly shows the score inputs as editable a moment too long, and the
  save request is rejected by the server/DB trigger, which is a UX
  papercut, not a data-integrity or fairness bug.
- **Positive**: this cleanly separates "is the UI's understanding of
  eligibility correct" (a unit-testable, deterministic question — see the
  Test stage's full branch-coverage matrix) from "is the actual guarantee
  intact" (structurally true regardless of this bolt's code, per
  `requirements.md §7`).
- **Consequence to carry forward**: any future bolt that touches
  predictions (Bolt 8's pool override/dual-save, Bolt 9's rankings) must
  preserve this same discipline — a save attempt is always routed through
  the backend API / DB trigger path, never a raw Supabase write to
  `Prediction.homeScore`/`awayScore` fields from mobile.
