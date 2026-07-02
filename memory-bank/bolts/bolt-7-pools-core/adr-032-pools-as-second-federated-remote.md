# ADR-032 — `pools` ships as this repo's second real Module Federation remote

## Status
Accepted (2026-07-01).

## Context

`requirements.md §7.4` placed `pools` as a firm **`Remote`** at Inception —
unlike `competition`, which was given a dual "Remote or shared" label that
Bolt 5 later resolved to **shared** (ADR-017) once it discovered Predictions
(host-placed) had a render-blocking dependency on competition's fixture
data. The task brief for this bolt explicitly asked whether Bolt 8's
"predictions↔pools integration" creates a similar pull for pools, rather
than assuming the Inception-level placement still holds unexamined.

Design-stage investigation (`design.md §1`) found:

1. `domain-overview.md §7`'s cross-feature dependency map — the
   authoritative, exhaustive list of every cross-feature pull in the
   product — has **no `predictions → pools` edge**, in either bolt's scope.
   This is the exact edge that existed for `competition` (`predictions →
   competition`, "reads match/team/fixture data") and forced ADR-017; its
   absence for `pools` is direct, not inferred.
2. Bolt 8's predictions-side pools integration (PREDICTIONS-3 dual-save,
   PREDICTIONS-4 reset-override) reads structurally as a small, secondary
   "which pool to save an override into" picker — not a dependency on
   pools' full CRUD/membership/settings UI. Predictions' primary screen
   content (Bolt 6) is fully rendered from `competition` + `predictions`'
   own global-prediction data alone, with zero pools involvement.
3. POOLS-6 (pools reading predictions data for its member-prediction grid)
   is the *inverse* direction, and goes through the shared `BackendApiClient`
   singleton (already an MF shared singleton per `system-context.md §4`) —
   not a JS-level import across the host/remote boundary.
4. Bolt 0's own scaffolding (`ScriptManager.setup.js`'s `REMOTES` comment,
   `federated-modules.d.ts`'s comment) already anticipated `pools` as a
   future remote entry, alongside `competition`/`scoring-rankings`/
   `notifications-preferences`/`admin` — an assumption that was never
   revisited the way `scoring`'s (ADR-015) or `competition`'s (ADR-017)
   were.
5. No native-module blocker: this bolt's scope needs no native module
   beyond what's already linked into the host binary (`system-context.md
   §4`'s explicit federation caveat about native-module presence).

## Decision

`pools` ships as `src/remotes/pools/` — a genuine, new federated Module
Federation remote (`rspack.config.pools-remote.mjs`), the first *feature*
remote (as opposed to Bolt 0's `education` demo shell) in this repo. The
host registers exactly one new `AppStack` route (`Pools`, `['protected']`
tag) that lazy-loads the remote's single exposed `./App` module
(`lazy(() => import('pools/App'))`), wrapped in the existing
`RemoteBoundary` — identical wiring shape to how `education` is already
mounted (Bolt 0).

This decision applies to the **UI/component layer** of pools
(`src/remotes/pools/`). The **domain layer** (`src/domain/pools/`, Model
stage) stays framework-free and filesystem-shared-root, exactly like
`scoring` and `competition`'s domain tier — so if Bolt 8 or any future bolt
needs pools' pure business-rule functions (e.g. `canInvite`,
`isVisibilityChangeNoOp`) from the host or from a different remote, they're
already available with zero MF-boundary cost, no different from how
Predictions already imports `@/domain/competition`'s pure functions without
needing `competition`'s full UI.

## Consequences

- `rspack.config.mjs` (host) gains one new `remotes` entry (`pools: pools@
  http://localhost:8083/${platform}/mf-manifest.json`) and `@shopify/
  flash-list` added to its `sharedDeps()` (eager) — the first time
  FlashList is needed as a cross-bundle shared singleton (see ADR-034).
- A new `rspack.config.pools-remote.mjs` is created, mirroring `rspack.
  config.education-remote.mjs`'s structure exactly (same `sharedDeps()`
  list, non-eager, plus `@shopify/flash-list`).
- `src/host/script-manager-setup.ts`'s `REMOTES` map gains a `pools` entry
  (dev server port `8083`).
- `src/host/federated-modules.d.ts` gains a `declare module 'pools/App'`
  entry.
- `AppStackParamList` gains `Pools: undefined`; `screen-registry.ts` gains
  `Pools: ['protected']`.
- If Bolt 8's actual implementation later surfaces a genuine
  render-blocking pull this investigation didn't anticipate, that is new
  evidence discovered at Bolt 8's own Design stage — Bolt 8 is free to
  revisit this ADR then, the same way ADR-017 revisited an earlier
  anticipation for `competition`. This ADR is not written to be
  unrevisable, only to record that the question was asked and answered
  with the evidence available now.
- Supersedes nothing in `requirements.md §7.4`/`system-context.md §4`
  (both already said "Remote" for pools, unqualified) — this ADR is the
  Construction-stage confirmation of that placement against pools'
  concrete scope, the same rigor ADR-017 applied to `competition`'s
  ambiguous placement, just with a different outcome because the evidence
  was different.
