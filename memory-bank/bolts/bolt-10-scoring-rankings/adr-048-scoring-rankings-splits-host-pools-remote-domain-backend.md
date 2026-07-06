# ADR-048 — `scoring-rankings` does NOT ship as a Module Federation remote; it splits across host, the existing `pools` remote, a filesystem-shared domain module, and the backend

## Status
Accepted (2026-07-06).

## Context

`requirements.md §7.4`/`system-context.md §4` default `scoring-rankings` to a
Module Federation **remote**, the same label originally carried by `pools`
and `competition`. Two prior bolts already re-examined this same class of
inherited placement call rather than rubber-stamping it: Bolt 5
(`competition`) **changed** its placement away from the Inception default
(ADR-017, filesystem-shared library instead of remote, driven by
Predictions' render-blocking dependency on match/team data); Bolt 7
(`pools`) **reconfirmed** its remote placement after a fresh check
(ADR-032→ADR-036). This bolt does the same real investigation for
`scoring-rankings`, against its own four concrete stories (RANKINGS-1..4),
per the task brief's explicit Design-stage instruction (`model.md §8` item
4) — not assuming the "Remote" default is still right unexamined.

`design.md §1.2`'s investigation trail:

1. **`domain-overview.md §7`'s cross-feature dependency map** — every edge
   involving `scoring-rankings` points **into** it (`predictions →`,
   `pools →`, `competition →`), never the reverse. This is the same
   directionality `pools`' own evidence trail found for itself (Bolt 7
   `design.md §1.2` point 4), not the render-blocking **outbound** pull that
   forced `competition`'s ADR-017 (`predictions → competition`, where
   competition's data *was* predictions' primary screen content). Nothing
   here structurally forces `scoring-rankings`'s consumers to co-locate with
   its own UI.
2. **What "reads resolved points for display" concretely means today**:
   Bolt 6's existing `buildScoreBreakdown`/`canShowScoreBreakdown` already
   recomputes a score breakdown client-side and does not call any
   `scoring-rankings` capability; this bolt's one new touch is an additive
   `pointsStatus` field on `MyPrediction` — a small enum read, not a
   UI-component import from another bundle.
3. **RANKINGS-2 (pool leaderboard) has the one placement question with real
   teeth**: the bolt-plan's own instruction is that the pool leaderboard
   fits into the existing pool-detail screen/tab structure, and
   `pool-detail-screen.tsx` **physically lives inside the `pools` remote**
   (`src/remotes/pools/screens/`, ADR-032/034). This project has **no
   precedent** for one remote dynamically loading or embedding another
   remote's screen inside its own internal stack navigator — every remote
   (`education`, `pools`) is mounted from the **host** as exactly one
   `lazy(() => import('x/App'))` entry point, and remotes don't import each
   other (Bolt 7 `design.md §4`). Shipping `scoring-rankings` as its own
   remote would force RANKINGS-2's screen into a *third* bundle that `pools`
   cannot embed inline without a new, unprecedented cross-remote-loading
   mechanism — real, avoidable complexity with no corresponding benefit.
4. **RANKINGS-1 (global ranking)** needs exactly **one** new top-level
   screen, structurally identical in shape to `Predictions` (Bolt 6, a
   single primary list screen hosted directly, not a multi-screen
   remote-shaped flow like `pools`' six screens). `requirements.md §7.4`
   places `predictions` on the host for exactly this reason.
5. **RANKINGS-3 (live projection) is not a screen at all** (`model.md §4`)
   — extra fields on the same rows, rendered by whichever screen already
   shows the ranking. It cannot, by itself, justify any bundle placement.
6. **RANKINGS-4 (finalize scoring) is backend-only** — no mobile UI
   placement question.
7. **Reuse of already-proven MF wiring, not re-proving it from scratch**: a
   new `scoring-rankings` remote would need its own rspack config, dev-server
   port, `ScriptManager` entry, and would have to re-prove the exact
   singleton risks Bolt 8/9 already found and fixed the hard way
   (`react-native-svg` double-registration, Tamagui duplicate-context,
   React-Query duplicate-`QueryClient`) for a *fourth* bundle. Placing
   RANKINGS-1 in the host and RANKINGS-2 inside the already-wired `pools`
   remote needs **zero new MF shared-singleton entries** — both bundles
   already carry `tamagui`, `i18next`/`react-i18next`,
   `@tanstack/react-query`, `@shopify/flash-list`, and (host-only)
   `lucide-react-native`.
8. **Native-module check** (`system-context.md §4`'s federation caveat): no
   new native module is needed by RANKINGS-1/2/3 (FlashList rows + Tamagui +
   one `lucide-react-native` tab icon, all already-linked) — no blocker
   either way from this angle, same finding as Bolt 7's for `pools`.

## Decision

`scoring-rankings` does **not** ship as a Module Federation remote. Its four
stories split across existing bundles by where their host screen or
navigable flow already lives:

| Story | Ships as | Bundle |
|---|---|---|
| RANKINGS-1 (global ranking) | new host screen, new 4th top-level tab (`RankingsTab`) | **Host** (`src/host/rankings/`) |
| RANKINGS-2 (pool leaderboard) | new screen inside the existing `pools` remote's internal stack, reached from `PoolDetailScreen` | **`pools` remote** (`src/remotes/pools/`) |
| RANKINGS-3 (live projection) | data fields + one shared, framework-free adapter — not a screen | **Domain, filesystem-shared** (`src/domain/rankings/`) |
| RANKINGS-4 (finalize scoring) | backend services + lazy sweep-on-read — no mobile UI placement question | **Backend** (`backend/src/services/scoring/`) |

`src/domain/rankings/` mirrors `src/domain/pools/`/`src/domain/competition/`'s
shape (pure functions/types, zero React/RN import), reused as-is from both
the host and the `pools` remote at zero MF cost — the same "one physical
directory, same `@` alias in every rspack config" invariant already
established by ADR-015/ADR-017/ADR-025. No MF `shared` config entry is added
for it: these are stateless pure functions with no module-level state
requiring a single-instance guarantee, unlike Tamagui's theme context or
React Query's `QueryClient`.

This is a genuine **change** from Inception's "scoring-rankings → Remote"
default — the same class of decision as ADR-017 for `competition` (a real
re-evaluation that supersedes the Inception-time anticipation), not a
reconfirm like ADR-032→036 for `pools`. `system-context.md §4`'s topology
diagram is superseded for `scoring-rankings`, the same way ADR-017 superseded
it for `competition` — the diagram is not edited retroactively; this ADR is
the record of the updated reasoning.

## Consequences

- No `rspack.config.scoring-rankings-remote.mjs`, no new dev-server port, no
  new `ScriptManager` entry — zero MF config churn for this bolt beyond one
  new internal route registered on the already-existing `pools` remote's own
  stack (`PoolsStackParamList` gains `PoolLeaderboard: { poolId: string }`).
- `MainTabParamList`/`screen-registry.ts`/`main-tab-navigator.tsx` gain a
  4th tab (`Rankings`, tagged `['protected']`, same shape as `Home`/
  `Predictions`/`Pools`) — confirms Bolt 9's own forward-compatibility check
  that `MainTabNavigator` was designed to accept additional `Tab.Screen`s
  without a reshape.
- Zero new MF shared-singleton entries needed — both consuming bundles
  already carry every runtime dependency this bolt's UI needs.
- **Consequence for future-remote precedent, flagged explicitly**: this is
  the first time a unit named "Remote" at Inception splits across *three*
  existing non-remote locations instead of becoming a new bundle or folding
  entirely into one shared library. Worth flagging for Bolt 13 (Admin, which
  also touches `scoring-rankings` per its "rescoring trigger" dependency) to
  redo this same investigation rather than assume Admin's own placement
  follows Rankings'.
- If a future bolt's scope for `scoring-rankings` grows into something with
  its own multi-screen flow (unlike today's single global screen + one
  nested pool screen), this placement should be re-examined again, not
  assumed permanent — same discipline this ADR itself just applied to the
  Inception default.
