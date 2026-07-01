# ADR-025 — New `PredictionsFixtureList`/`PredictionMatchCard`, not a row-renderer prop on Bolt 5's `FixtureList`

## Context

Bolt 5's `FixtureList` (`@/shared/competition/components/fixture-list.tsx`)
renders a day-grouped, virtualized (`@shopify/flash-list`) list of matches,
but hardcodes each row to Bolt 5's own read-only `MatchCard` — there is no
prop to substitute a different row component, and `MatchCard` itself has no
prediction-entry affordance (by design; COMPETITION-1's scope was read-only
display only).

This bolt needs the same day-grouped/virtualized shell, but each row must
additionally render score-input fields, a penalty-winner selector (for tied
knockout matches), a save action, and a score-breakdown panel (for finished
matches) — all driven by per-match prediction state `FixtureList`/
`MatchCard` know nothing about.

Two options were weighed:

1. **Extend `FixtureList`** with a `renderMatchRow?: (match: Match) =>
   ReactElement` prop (defaulting to `<MatchCard>` for backward
   compatibility), so Predictions passes its own row renderer.
2. **New host-owned `PredictionsFixtureList`** that reuses the *domain*
   grouping functions (`buildFixtureView`, `groupMatchesByDay`) and the
   presentational `FixtureDaySectionHeader`, but owns its own FlashList
   wiring (`renderItem`/`keyExtractor`/`getItemType`) and renders a new
   `PredictionMatchCard`.

## Decision

**Option 2.** `src/host/predictions/components/predictions-fixture-list.tsx`
is a new, host-owned component. It imports and reuses:
- `buildFixtureView`/`FixtureView`/`Match` (domain, `@/domain/competition`)
- `FixtureDaySectionHeader` (presentational, `@/shared/competition`)
- `TeamBadge`, `LiveIndicator` (presentational, `@/shared/competition`, used
  inside the new `PredictionMatchCard`, not inside Bolt 5's `MatchCard`)

It does **not** import `FixtureList` or `MatchCard` — those remain Bolt 5's
read-only fixture-browsing components, unmodified by this bolt.

## Rationale

- `FixtureList`/`MatchCard` are filesystem-shared code (ADR-017) — the same
  "single physical implementation" discipline that governs `scoring`
  (ADR-015/ADR-016) applies to them. Adding a generic row-substitution
  escape hatch the first time a second consumer shows up is exactly the
  kind of change that, over several bolts, turns a focused shared component
  into a grab-bag of optional props serving unrelated use cases (read-only
  browsing vs. read-write prediction entry are genuinely different
  concerns, not just different styling).
- The duplication cost is small and explicit: `PredictionsFixtureList`
  duplicates roughly `FixtureList`'s ~40 lines of FlashList
  wiring/flattening logic, not any of its domain logic (which is imported,
  not copied) or its presentational sub-components (`FixtureDaySectionHeader`
  is reused as-is; `TeamBadge`/`LiveIndicator` are reused as-is inside the
  new `PredictionMatchCard`).
- If a third consumer later needs the same "day-grouped virtualized list
  with a substitutable row" shape, that is the point to promote to a
  `renderMatchRow` prop on a shared shell — justified by three real
  data points (Bolt 5's own `MatchCard` usage, this bolt's
  `PredictionMatchCard`, and whatever the third case is), not a
  speculative two-case guess made now.

## Consequences

- **Positive**: Bolt 5's `FixtureList`/`MatchCard` are untouched by this
  bolt — zero risk of regressing COMPETITION-1's already-shipped,
  Layer-1-tested read-only fixture browsing.
- **Positive**: `PredictionMatchCard`'s prop shape and internal edit-state
  handling are free to evolve for Bolt 6/8/9's needs without being
  constrained by `MatchCard`'s existing (and intentionally simpler) props.
- **Negative / tracked cost**: two FlashList-wiring implementations now
  exist in the codebase (`fixture-list.tsx` and
  `predictions-fixture-list.tsx`). Both apply the same
  `vercel-react-native-skills` memoization discipline (ADR-022's precedent),
  so there is no perf-quality divergence, only a code-duplication one. This
  is the deliberate tradeoff described above, re-evaluate if a third
  consumer appears.
