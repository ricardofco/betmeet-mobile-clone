# ADR-036 — `pools` remote placement (ADR-032) re-examined and reconfirmed for the predictions↔pools integration

## Status
Accepted (2026-07-02).

## Context

Bolt 7's ADR-032 placed `pools` as this repo's second real Module
Federation remote, and explicitly flagged an escape hatch: *"If Bolt 8's
actual implementation surfaces a genuine render-blocking pull that this
investigation didn't anticipate, that is new evidence discovered at Bolt
8's own Design stage, and Bolt 8 gets to revisit this ADR."* Bolt 7's own
`design.md §1.3` went further and pre-committed to a specific anticipated
shape for exactly this integration:

- Host side: a small new capability read (`{id, name}[]`) called directly
  through `BackendApiClient` — no import of `src/remotes/pools/` or its UI.
- Remote side: POOLS-6's grid calls `predictions.*` capabilities directly
  through the same shared `BackendApiClient` — no import of host or
  `predictions` code either.

This bolt's task brief explicitly instructed re-examining this ADR at
Design stage rather than rubber-stamping the prior anticipation.

## Decision

**ADR-032 holds. `pools` remains a Module Federation remote, unchanged
placement.** The re-examination (`design.md §1`) checked the anticipated
shape against this bolt's actual Model-stage output (§5/§6 of `model.md`)
and found an exact match:

- PREDICTIONS-3's pool-override picker needs exactly a lean
  `pools.getMyPoolsForPicker()` capability read (`PoolPickerEntry[]`),
  consumed by a new host-owned component — zero imports from
  `src/remotes/pools/`.
- POOLS-6's grid needs a new `pools.getMemberPredictions` capability the
  `pools` remote calls directly — zero imports from `src/host/predictions/`.

No new cross-bundle JS import is introduced in either direction. The only
imports either side gains are filesystem-shared-root `src/domain/*` pure
functions/types (already zero-MF-cost, same category as the existing
`predictions → src/domain/competition` relationship).

## Consequences

- No rspack/Module Federation config change in this bolt — no new remote,
  no new shared-singleton dependency.
- The integration stays exactly as narrow as Bolt 7 anticipated: a
  picker-list read in one direction, a capability-contract read in the
  other. If a future bolt needs the pools remote to render host-owned
  predictions UI (or vice versa) directly, that is new evidence and should
  trigger its own re-examination — not assumed from this bolt's outcome.
- This is the second time this repo has explicitly re-examined and
  reconfirmed a placement ADR at a dependent bolt's Design stage (the first
  being ADR-017 re-examining Inception's `competition` placement) —
  establishing that this is a routine, expected checkpoint for any ADR
  with a stated "revisit if new evidence" clause, not a one-off.
