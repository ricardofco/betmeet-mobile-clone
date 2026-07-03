# ADR-037 — Predictions' host-only component/hook tier (ADR-024) re-examined and reconfirmed; POOLS-6 gets its own components

## Status
Accepted (2026-07-02).

## Context

ADR-024 (Bolt 6) kept `src/host/predictions/` host-only — no
`src/shared/predictions/` tier — with an explicit "promote on second
consumer" note. Bolt 8's POOLS-6 grid is the first bolt where a second
surface (the `pools` remote) needs to render prediction-shaped UI,
triggering the question this ADR resolves.

## Decision

**ADR-024 holds. Not promoted.** `design.md §2.2` compared the two
surfaces field-by-field:

| | Predictions screen (host) | POOLS-6 grid (`pools` remote) |
|---|---|---|
| Unit of UI | One editable card per match, one user | One grid: matches × every pool member, mostly read-only |
| Editable rows | Every visible row | Only the viewer's own row |
| Penalty-winner entry | Yes | No (reuses the existing global-entry surface for that, not re-hosted) |
| Score-breakdown panel | Yes | No (compact points badge instead) |
| List shape | Day-grouped flat list | Day-grouped list with nested member sub-rows |

The only literally-identical piece is a ~40-line numeric score stepper
with no business logic beyond 0–20 clamping. Everything else is either
inapplicable to the grid or shaped specifically for a single-user card.

POOLS-6 therefore gets its own small, remote-owned components
(`src/remotes/pools/components/prediction-grid-day-section.tsx`,
`prediction-grid-cell.tsx`, `pool-score-stepper.tsx`) rather than a
promotion of `src/host/predictions/` to a shared tier. The score stepper
is deliberately duplicated (~40 lines) as a physically separate component,
mirroring ADR-025's exact reasoning for `PredictionsFixtureList`/
`PredictionMatchCard` vs. Bolt 5's `FixtureList`/`MatchCard`.

## Consequences

- No new `src/shared/predictions/` directory, no new MF shared-config
  entry for any predictions-specific component.
- A small, accepted amount of duplication (one score stepper) exists
  across the host/remote boundary — same category of duplication already
  accepted for `pool-permissions.ts`/`prediction-eligibility.ts` across
  the mobile/backend boundary (ADR-016's checklist item 3), just applied
  here across a mobile-internal bundle boundary instead.
- **Future trigger for revisiting this ADR together with ADR-024**: if a
  future bolt needs the pools remote to embed the *editable*
  prediction-entry surface itself (score + penalty-winner + validation,
  not just a read-mostly grid with a simple override stepper), that is the
  point at which genuine second-consumer need exists and promotion should
  be reconsidered — not assumed now.
- Establishes, alongside ADR-036, that this repo treats "promote on second
  consumer" notes as real checkpoints requiring an actual field-by-field
  comparison at the triggering bolt, not an automatic promotion the moment
  a second bundle touches related data.
