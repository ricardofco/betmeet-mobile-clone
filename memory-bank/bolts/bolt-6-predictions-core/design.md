# Bolt 6 — Design

## 1. Module Federation placement

**Host** (`src/host/predictions/`) — per `requirements.md §7.4`, explicitly
correcting the default suggestion: Predictions is the highest-frequency
screen in the product and must not pay an on-demand remote-download cost.
This is an inception-level decision (`bolt-plan.md`, `requirements.md §7`)
and is **not revisited** here — no ADR re-litigates it, one ADR (ADR-023)
records the layering choice within the host.

Layering, matching the `domain/` (framework-free) vs `shared/` (React/RN,
cross-bundle-reusable) vs `host/` (single-bundle, screen-owning) split
established in Bolts 0/3/5:

```
src/domain/predictions/        framework-free (Model stage, done)
src/shared/predictions/        NOT created — nothing here is reused by another
                                bundle/remote yet (see ADR-024); everything
                                RN-specific lives directly in host/ instead
src/host/predictions/
  ├── screens/
  │   └── predictions-screen.tsx
  ├── components/
  │   ├── prediction-match-card.tsx
  │   ├── prediction-score-input.tsx
  │   ├── penalty-winner-selector.tsx
  │   └── score-breakdown-panel.tsx
  ├── hooks/
  │   └── use-predictions-query.ts
  └── navigation/
      └── (no new stack — Predictions is a single screen, registered
           directly on AppStack, see §4)
src/platform/backend-api/predictions-api.ts   (new capability group)
```

## 2. Why host-owned `predictions` components, not `shared/predictions`

Bolt 5 shipped `competition` as a **filesystem-shared** library (ADR-017)
because multiple *bundles* (host's Predictions screen, a hypothetical future
standalone fixture-browse remote) need the same read-only fixture data.
Predictions' own UI (score inputs, penalty selector, save mutation) has
exactly **one** consumer today — the host's Predictions screen — so there is
no cross-bundle reuse case yet to justify a `src/shared/predictions/` tier.
If Bolt 8 (pools↔predictions integration) or Bolt 9 (rankings, which needs a
read-only "my prediction vs result" row) turns out to need this UI from a
different bundle, promote at that point — same reasoning ADR-018 used for
`competition`'s two-tier split, applied in reverse (start host-only, promote
on second consumer, not preemptively). Recorded as ADR-024.

The **domain** layer (`src/domain/predictions/`, Model stage) is still
framework-free and already sits at the shared root, exactly like `scoring`
and `competition`'s domain tier — so if a future remote needs the
*eligibility/validation/score-display* logic without the RN components, it's
already available with zero extra work. Only the RN component tier is
host-scoped for now.

## 3. Component tree & data flow

```
PredictionsScreen (host/predictions/screens/predictions-screen.tsx)
 ├── useFixtureQuery()            [Bolt 5, @/shared/competition]
 ├── usePredictionsQuery()        [new, host/predictions/hooks]
 ├── useLiveCompetitionSubscription(matches)  [Bolt 5]
 ├── (joins fixture + predictions client-side into MatchWithMyPrediction[])
 └── PredictionsFixtureList (host/predictions/components)
      ├── FixtureDaySectionHeader   [reused from @/shared/competition]
      └── PredictionMatchCard (per match)
           ├── TeamBadge × 2         [reused from @/shared/competition]
           ├── LiveIndicator         [reused from @/shared/competition, when live]
           ├── PredictionScoreInput × 2  (home/away, only when editable)
           ├── PenaltyWinnerSelector     (only when tied knockout, editable)
           ├── ScoreBreakdownPanel       (only when canShowScoreBreakdown)
           └── save button / eligibility lock copy (describeLockReason)
```

### 3.1 Why a new `PredictionsFixtureList`, not reusing Bolt 5's `FixtureList`

`FixtureList` (`@/shared/competition/components/fixture-list.tsx`) hardcodes
`renderItem` to Bolt 5's read-only `MatchCard` — it has no row-renderer prop
to substitute a prediction-capable row, and `MatchCard` itself has no
prediction affordance (by design — COMPETITION-1's scope was read-only
fixture display). Two options were considered:

1. Add a `renderMatchRow` prop to `FixtureList` so Predictions substitutes
   its own row component.
2. A host-owned `PredictionsFixtureList` that duplicates `FixtureList`'s
   day-flattening/FlashList-recycling shell (using the same
   `groupMatchesByDay`/`buildFixtureView`/`FixtureDaySectionHeader`) but
   renders `PredictionMatchCard` instead of `MatchCard`.

**Decision: option 2.** Reasoning captured in ADR-025 — touching Bolt 5's
`FixtureList` to add a generic row-renderer prop is exactly the kind of
"shared component drifts to serve two masters" pattern that erodes a
filesystem-shared library's single-source guarantee over time (same spirit
as ADR-015/ADR-017's "one physical implementation" invariant, just applied
to a component instead of a function). `PredictionsFixtureList` reuses every
*domain* function (`buildFixtureView`, `groupMatchesByDay`) and the
presentational `FixtureDaySectionHeader`, but owns its own `renderItem`/
`getItemType`/FlashList wiring — a small, deliberate duplication (~40 lines)
in exchange for zero coupling between Bolt 5's read-only fixture browsing
and Bolt 6's read-write prediction entry. If a third consumer needs the same
row-substitution shape later, promoting to a shared `renderMatchRow` prop
becomes justified by three data points instead of a preemptive guess.

## 4. Navigation / host screen placement

Registered directly on the existing `AppStack` in
`src/host/navigation/root-navigator.tsx` (no new stack navigator — this is
one screen, not a multi-step flow like onboarding):

- New route `Predictions`, tag `['protected']` in `screen-registry.ts` (same
  tag as `Home`/`AccountSettings` — reachable only past the onboarding gate,
  per `AuthGatedNavigator`'s existing `proceed`/`renderAppTree()` branch;
  Bolt 3's onboarding gate is a **dependency**, not something this bolt
  re-implements).
- `HomeScreen` (currently a placeholder with only the education-remote demo
  button) gets a "Predictions" navigation entry point — the minimal
  necessary change to `root-navigator.tsx` to make the screen reachable at
  all. `AppStackParamList` gains `Predictions: undefined`.

This is the **first bolt to mount Bolt 5's fixture-derived data on a real
screen** (via `useFixtureQuery`/`useLiveCompetitionSubscription`, composed
into `PredictionsFixtureList`, not via `FixtureList` itself — see §3.1). Per
the task brief, this bolt's Layer 2 device-verification plan therefore also
covers Bolt 5's six deferred manual test paths (`implement-and-test.md`),
since `useFixtureQuery`/`useLiveCompetitionSubscription` are the same hooks,
now exercised through a real mounted screen — even though the *rendering*
component (`PredictionsFixtureList`/`PredictionMatchCard`) is this bolt's
own, not `FixtureList`/`MatchCard`.

## 5. State boundaries (TanStack Query + Zustand, per Bolt 0 ADR-004)

| State | Owner | Mechanism |
|---|---|---|
| Fixture data (matches) | Bolt 5 | `useFixtureQuery()` — `['competition', 'fixture']`, already exists, reused unchanged |
| My predictions (this match, all matches) | This bolt | `usePredictionsQuery()` — new flat key `['predictions', 'mine']` (ADR-019 precedent: flat key, no per-match sub-keys) |
| Per-match in-progress edit (home/away score draft, penalty pick, before save) | This bolt | **Local component state** (`useState` inside `PredictionMatchCard`), not Zustand and not a query — this is ephemeral, single-owner, single-consumer UI state exactly like `LiveSubscriptionState` (ADR-020's reasoning for *not* promoting single-consumer state to a store) |
| Save mutation | This bolt | `useSavePredictionMutation()` — invalidates `['predictions', 'mine']` on success (same invalidate-on-mutate pattern as `use-profile-query.ts`'s `useSetLocaleMutation`) |
| "Now" (for eligibility/lock evaluation) | This bolt | Passed explicitly by the screen (`new Date().toISOString()`), never cached — same ADR-019 discipline: a lock decision that depends on "now" must never be memoized inside a query result |

No new Zustand store is introduced by this bolt. There is no cross-cutting
UI toggle analogous to `competition-store.ts`'s past-matches flag — the
past-matches toggle itself is **reused** from `@/shared/competition`'s
existing `useCompetitionStore` (one shared toggle, one shared store,
consumed by both Bolt 5's future fixture-browse screen and this bolt's
Predictions screen — no duplication).

## 6. `predictions-api.ts` capability group (new)

Same seam pattern as `competition-api.ts`/`profile-api.ts` — typed wrappers
around `BackendApiClient.request()`, no new transport:

```ts
predictionsApi.getMyPredictions(): Promise<MyPrediction[]>
predictionsApi.savePrediction(input: SavePredictionInput): Promise<MyPrediction>
```

`getMyPredictions()` returns a flat list (not joined to matches) —
joining fixture + predictions into `MatchWithMyPrediction[]` happens
**client-side** in `usePredictionsQuery`'s consuming code (a `select`-time
derivation, mirroring ADR-019's "derive at read time" precedent), not
server-side — this keeps `competition.getFixture` (Bolt 5) and
`predictions.getMyPredictions` (this bolt) as two independent, cacheable
queries rather than requiring a combined backend endpoint
(`getFixtureWithMyPredictions`) that this repo doesn't have a concrete
contract for yet. If/when the real backend exposes a combined endpoint,
swapping to it is a change isolated to this one join function, not to any
component.

`savePrediction` always sends `poolId: null` in this bolt (global
prediction only) — the request shape includes the field (future-proofing
for Bolt 8) but this bolt's UI never populates it non-null.

## 7. Score-breakdown display placement (PREDICTIONS-5)

`ScoreBreakdownPanel` renders inside `PredictionMatchCard`, gated by
`canShowScoreBreakdown(match)` (domain function, Model stage) — shown only
for `FINISHED` matches where the viewer has a prediction. Calls
`buildScoreBreakdown()` (domain function) and renders `ScoreBreakdown`'s
`matchedCase`/`totalPoints`/`components` fields as plain text rows; no new
visual design system is introduced (matches the plain `Text`/`View`
component style already established by `match-card.tsx`/`team-badge.tsx`).

No dependency on the education remote's score-breakdown explainer
component is introduced in this bolt (`domain-overview.md §7`'s
`predictions → education` reuse note is a *future* / stretch item per
`system-context.md`'s dependency list, and building a cross-bundle shared UI
component between a host screen and a remote is out of this bolt's approved
scope — flagging as a deliberate scope-narrowing, not an oversight, since
implementing it would mean either (a) the host importing from the
`education` remote, which inverts the intended host→remote-on-demand
direction, or (b) promoting the explainer to `shared/`, which is a
legitimate future refactor once Bolt 11 (Education) exists to compare
against).

## 8. Performance considerations (bolt-plan's named risk)

- **Bundle-size discipline**: no new heavy dependency is added by this bolt
  — `PredictionsFixtureList`/`PredictionMatchCard` are built from
  already-available primitives (`@shopify/flash-list` from Bolt 5,
  `react-native` core `TextInput`, `Pressable`). `predictions-api.ts` adds
  no transport. Verified in Implement stage via a bundle-size sanity check
  (no new `dependencies` entry in `package.json`).
- **List perf**: `PredictionsFixtureList` follows the exact same
  `vercel-react-native-skills` discipline ADR-022 established for
  `FixtureList` — `useMemo`-flattened rows, `useCallback`-stabilized
  `renderItem`/`keyExtractor`/`getItemType`, `React.memo`-wrapped row
  component (`PredictionMatchCard`). Per-row edit state is local to each
  `PredictionMatchCard` instance so typing a score in one row never
  re-renders sibling rows.
- **Kickoff-lock correctness** (the bolt-plan's other named risk): covered
  by the Model-stage `getPredictionEligibility` port (verbatim branch order
  from `domain-overview.md §4.2`) plus an explicit unit-test matrix in the
  Test stage covering every branch, and an explicit statement in ADR-023
  that this client-side check is advisory-only.

## 9. Testing approach preview

- Domain (Model stage, already written): unit tests for
  `getPredictionEligibility`, `validatePredictionEntry`,
  `shouldShowPenaltyWinnerSelector`, `canShowScoreBreakdown`,
  `buildScoreBreakdown`.
- Component (RNTL): `PredictionScoreInput`, `PenaltyWinnerSelector`,
  `ScoreBreakdownPanel`, `PredictionMatchCard` (composition + save flow),
  `PredictionsFixtureList` (day-grouping renders, matches Bolt 5's own test
  shape), `predictions-screen.tsx` (loading/error/loaded states, mounts
  `useLiveCompetitionSubscription`).
- Hooks: `usePredictionsQuery`/`useSavePredictionMutation` (query-key
  invalidation contract, mirroring `use-profile-query.test.ts`'s shape).
- Device/E2E (Layer 2, `agent-device` conventions): documented manual test
  paths in `implement-and-test.md`, including Bolt 5's six deferred paths
  now exercisable through this screen.
