# ADR-062 — ADMIN-4's mobile copy states plainly that forcing a result is currently this app's only path to a finished-with-scores match

## Status
Accepted (2026-07-06).

## Context

betmeet-clone frames force-result (BR-7.2/7.3/7.4/7.5/7.16,
`actions/force-result.ts`) as an **occasional correction** layered on top of
a normally-reliable automated results feed: BR-7.6/7.7's override precedence
guarantees a provider sync always wins over a manual override on its next
run — the `manualOverride` flag/audit trail is retained only as historical
record once overwritten, never blocking the next sync.

This mobile backend has no sync orchestrator at all (`model.md §4`, ADR-058's
narrowed scope). `model.md §5` confirms the consequence directly: a
force-result's `manualOverride = true` state has **no mechanism that will
ever supersede it** in this app today — whatever an admin enters via ADMIN-4
is not just "the fallback until real data arrives," it is functionally **the
only path** by which this mobile backend's matches ever become
`FINISHED`-with-scores at all, absent Bolt 10's one-time additive seed script
or a future real sync bolt. This is a genuine, confirmed asymmetry from
betmeet-clone's own product framing, flagged explicitly in `model.md §9` item
6 as a Design-stage copy/UX decision, not something to silently inherit.

## Decision

`force-result-screen.tsx` carries a description line, not buried in help
text, stating this plainly (`design.md §8`):

> *"This app has no automatic results feed. Forcing a result here is
> currently the only way a match becomes finished with scores."*

This is a **deliberate departure** from betmeet-clone's own UI framing
("occasional correction on top of a normally-reliable feed"), chosen because
that framing does not describe this app's actual situation and would
understate ADMIN-4's real product role here.

## Consequences

- Every other piece of ADMIN-4's behavior (input validation, penalty-winner
  derivation/cross-check, atomic Match-row update + synchronous `scoreMatch`
  rescore, override precedence as a historical-record-only flag) is ported
  unchanged from betmeet-clone (`design.md §6.2`) — this ADR affects **copy
  only**, not domain logic or the backend contract.
- Sets a precedent, alongside ADR-058's honestly-labeled "Rescoring sweep"
  (not "Sync") copy: when a ported feature's real-world role in this mobile
  app materially differs from betmeet-clone's own framing because an
  underlying mechanism (here, sync; there, the same) doesn't exist in this
  backend, the mobile UI's copy should say so plainly rather than silently
  inherit the source app's framing — worth recording explicitly at the ADR
  level, not treated as an incidental wording choice.
- If a future bolt ever builds a real football-data.org sync orchestrator in
  this backend (closing the gap ADR-058 and this ADR both work around),
  this copy becomes inaccurate and must be revisited/removed at that time —
  flagged here so it isn't left stale silently.
