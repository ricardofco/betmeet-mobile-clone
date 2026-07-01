# ADR-024 — Predictions' RN component/hook tier stays host-only; no `src/shared/predictions/`

## Context

Bolt 5 (`competition`) shipped a two-tier `domain/` + `shared/` split
(ADR-018) because `competition`'s RN components/hooks have (at least) two
real bundle consumers: the host's Predictions screen (this bolt) and a
future standalone, remote-hosted fixture-browse screen
(`requirements.md §7.4`: "Remote or shared" was explicitly left open for
`competition`, resolved to "shared" by ADR-017 precisely because of this
dual-consumer shape).

Predictions' own RN-specific code (score-input components, the penalty
selector, the score-breakdown panel, the predictions query/mutation hooks)
has exactly **one** consumer as of this bolt: the host's own Predictions
screen. Module Federation placement for `predictions` itself is already
decided at the inception level — **host**, not remote, not shared
(`requirements.md §7.4`, not revisited here) — so there is no second bundle
that would need to import this UI the way the `education` remote or a
hypothetical fixture-browse remote would need `competition`'s UI.

## Decision

Predictions' RN component/hook tier lives directly under `src/host/
predictions/` (`components/`, `hooks/`, `screens/`) — **no**
`src/shared/predictions/` directory is created by this bolt. The **domain**
tier (`src/domain/predictions/`, Model stage) remains framework-free and
sits at the shared root exactly like `scoring` and `competition`'s domain
tiers, so it is already reusable by any future bundle without this
decision needing to be revisited for the pure-logic half.

If a later bolt introduces a second consumer of this UI — e.g. Bolt 9
(Rankings) needing a read-only "my prediction vs. actual result" row, or
Bolt 8 needing the score-input component inside a pool-scoped override
flow — promote the specific reused pieces to `src/shared/predictions/` at
that point, following the same domain/shared split shape ADR-018
established. This is a deliberate "promote on second consumer," not
"promote preemptively" call, matching how `competition` itself wasn't
pre-emptively split until Bolt 6 (this bolt) created the actual second
consumption pattern that justified it.

## Consequences

- **Positive**: no premature abstraction — the component tree, prop
  shapes, and state boundaries can still move freely during this bolt's
  Implement stage without needing to satisfy a second consumer's needs that
  don't exist yet.
- **Positive**: keeps the host bundle's internal structure simple — one
  less filesystem-shared-library seam to reason about for a feature that,
  per its own MF placement decision, will never be consumed by a remote.
- **Consequence to track**: Bolt 8 and Bolt 9 must check this ADR before
  assuming `src/shared/predictions/` exists — if either needs to reuse this
  bolt's components, the correct action is to *move* files into a new
  `src/shared/predictions/` tier (mirroring ADR-018's split) and update
  this ADR's status, not to import directly from `src/host/predictions/`
  across a bundle boundary (which would violate the same discipline
  ADR-015/ADR-017 established for `scoring`/`competition`).
