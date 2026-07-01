# Bolt 5 — Competition Read Model — Design Stage

> **Stage 2 of 5 (Design).** Component/data-flow design: placement, state boundaries, navigation. Checkpoint: pause for approval before ADR.

## 1. Federation placement — resolving the "Remote or shared" open question

`requirements.md §7.4` leaves `competition` as **"Remote or shared"** (the only feature group not given a single firm placement at Inception) and `unit-brief.md` repeats the same ambiguity. This bolt must resolve it.

### Evidence gathered

- `requirements.md §7.4`: `predictions` is **explicitly host-placed**, called out as an "explicit correction from the default suggestion" specifically because it's "the highest-frequency screen in the product — must not pay an on-demand download cost."
- `unit-05-predictions/unit-brief.md`: "Depends on: ... `unit-04-competition` (match/team data, kickoff time, phase type)." PREDICTIONS-1's own dependency list: "`unit-04-competition` (match/team/kickoff data)." The prediction form **cannot render at all** without competition data — it is not an optional enhancement on that screen, it is the screen's primary content (the list of matches to predict on).
- `domain-overview.md §7` dependency map: `predictions ───────→ competition (reads match/team/fixture data)` is listed as a direct, synchronous, render-blocking dependency, not an occasional cross-feature read.
- `unit-04-competition/unit-brief.md`: "Depended on by: `unit-05-predictions` (fixture data + team data), `unit-07-scoring-rankings` ..., `unit-10-admin` ...". Predictions is competition's **first and highest-frequency** consumer.
- Bolt-plan sequencing (`progress.md`): Bolt 6 (Predictions) depends on Bolt 5 — confirming the product intends predictions to consume this bolt's output directly, soon.
- `system-architecture.md`/`coding-standards.md`: "keep the host bundle lean — push heavy/optional features into federated remote chunks." Competition's domain logic (day-grouping, live-update policy, FIFA/flag mapping) is **not heavy** (pure functions + a flat list + bundled small SVGs) and is **not optional** for the host's hottest screen.

### Decision (recorded fully in ADR-017)

**`competition`'s domain/platform read-model logic ships as a `src/shared/competition/` library (filesystem-shared, same pattern as Bolt 4's `scoring` — ADR-015), consumed directly by the host's Predictions screen (Bolt 6) with zero remote-download cost on that hot path.**

A **standalone fixture-browsing screen** (a dedicated "Matches" tab/screen showing the full grouped fixture list independent of predicting) — if and when the product wants one as a separate navigable destination — is the part that is a legitimate candidate for a federated remote, since *browsing* fixtures (as opposed to *predicting* against them) is lower-frequency than the predictions screen itself. This bolt does not build that standalone screen (no story in COMPETITION-1/2/3 asks for a dedicated "browse-only" route; COMPETITION-1's AC describes "the fixture screen," which Bolt 6 will mount inside the host's Predictions flow). Bolt 6 may choose to expose competition's existing `src/shared/competition/` components from the host directly, or — if a separate low-frequency "browse" entry point is added later — mount them inside a future remote without duplicating the domain logic, exactly the same shared-singleton structure `scoring` already proves out.

This is **not** the same answer as ADR-002's anticipation (the system-context.md diagram shows `competition` as one of four boxes under "Module Federation v2 (on-demand remotes)"). That diagram is now superseded for the *data/domain* layer by this ADR, the same way ADR-015 superseded ADR-002's anticipation for `scoring`. The diagram's remote-chunk boxes remain valid for any **UI-only, browse-only, non-render-blocking** competition screen built later — just not for the shared domain/query layer this bolt produces.

## 2. Component design

### 2.1 File structure

```
src/domain/competition/
  match-status.ts            — MatchStatus type, status-display helpers (label/color tag, no React)
  fixture-day-grouping.ts     — FixtureDayGroup, FixtureView, groupMatchesByDay(), decidePastDayLingering()
  live-update-policy.ts       — LiveUpdateRelevance, evaluateLiveUpdateRelevance(), LiveSubscriptionState transitions
  fifa-team-display.ts        — FifaTrigram/FlagAssetKey types, team-display helpers
  index.ts                    — barrel
  __tests__/
    fixture-day-grouping.test.ts
    live-update-policy.test.ts
    fifa-team-display.test.ts
    match-status.test.ts

src/shared/competition/
  flags/
    index.ts                  — FlagAssetKey → SVG component map (react-native-svg, vendored assets)
    assets/*.svg               — vendored flags (lipis/flag-icons subset: all WC2026-eligible teams + gb-eng/gb-sct/gb-wls)
  components/
    team-badge.tsx             — flag + fifaCode + name, memoized (vercel-react-native-skills: memoize list items)
    match-card.tsx              — one match row: TeamBadge x2, kickoff time (localized), status pill
    fixture-day-section.tsx     — section header (date) + its matches, used as FlashList section data
    fixture-list.tsx            — FlashList wrapper rendering FixtureView, with the past-matches toggle
    live-indicator.tsx          — small "LIVE" pill, isolated so only it re-renders on a live-data refetch
  hooks/
    use-fixture-query.ts        — TanStack Query: fetches the flat match list, derives FixtureView
    use-live-competition-subscription.ts — Realtime subscription + polling fallback + debounce, drives query invalidation
  competition-store.ts          — Zustand: client-only UI state (past-matches toggle, selected day)
  index.ts                      — barrel (the one import path: `@/shared/competition`)
  __tests__/
    fixture-list.test.tsx
    match-card.test.tsx
    team-badge.test.tsx
    use-fixture-query.test.tsx
    use-live-competition-subscription.test.tsx
    competition-store.test.ts

src/platform/backend-api/competition-api.ts   — typed `competition.*` capability wrappers (same pattern as profile-api.ts)
src/platform/supabase/supabase-adapter.ts      — extended: subscribeToLiveResults() / unsubscribe (Bolt 5 addition)
```

**Why `src/domain/` + `src/shared/` (not just one folder), mirroring the existing two-tier convention:** `src/domain/competition/` holds framework-free pure logic (testable with plain Jest, no RNTL) — consistent with `src/domain/auth/`, `src/domain/profile/`. `src/shared/competition/` holds the RN components/hooks/store that *use* that domain logic plus React/RN-specific code (FlashList, Zustand, TanStack Query) — consistent with how `scoring` (Bolt 4) is pure-domain-only because it has no UI at all, while competition *does* have UI, so it needs the extra `shared/` component layer. Both directories resolve via the existing `@` alias in every rspack config (host + any future remote) — no new alias needed.

### 2.2 Why FlashList here specifically (vercel-react-native-skills)

COMPETITION-1's fixture list is the first genuinely unbounded scrolling list in this codebase (Bolt 3's avatar grid was explicitly *not* FlashList-worthy per ADR-014's "bounded/small list" reasoning — this is the opposite case: every match across every phase of a 104-match World Cup tournament, grouped into many day-sections). `fixture-list.tsx` uses `FlashList`'s section-list-equivalent pattern (sticky day headers + match rows) — first consumer of FlashList in this repo, so this bolt adds the dependency (`@shopify/flash-list`) to `package.json`.

`match-card.tsx`/`team-badge.tsx` are wrapped in `React.memo` (stable props: a match's identity + status rarely changes between renders) per the skill's "memoize list items" rule. No inline function/object literals are passed as list-item props — callbacks (e.g. "view match detail," not built in this bolt) would be `useCallback`-stabilized at the list level, not recreated per row.

## 3. State design

### 3.1 Server state — TanStack Query (per project convention, ADR-004/Bolt 0)

```ts
// use-fixture-query.ts
export const FIXTURE_QUERY_KEY = ['competition', 'fixture'] as const;

useQuery<Match[]>({
  queryKey: FIXTURE_QUERY_KEY,
  queryFn: () => competitionApi.getFixture(),
});
```

One query key for the flat match list — both the standalone fixture browse case (future) and Bolt 6's Predictions screen read through the **same key**, so a live-signal-triggered `invalidateQueries(FIXTURE_QUERY_KEY)` refreshes every screen currently mounted against it, with no duplicate fetches. This directly mirrors `use-profile-query.ts`'s established pattern ("Settings screen and wizard both read through the same query key so a mutation in one place invalidates the other" — design.md §4 precedent from Bolt 3).

`FixtureDayGroup`/`FixtureView` (the grouped, linger-window-applied shape) is **derived in the hook via `select`**, not stored as a second query — `groupMatchesByDay()`/`decidePastDayLingering()` (domain layer, pure) run over the raw `Match[]` on every read, recomputed against "now" at render time rather than cached as if it were server data (the grouping depends on the *viewer's clock*, which is not something the server returned and must never go stale relative to a cached query result).

No mutations in this bolt — competition is read-only (`unit-brief.md` "Out of scope": sync/admin overrides). `competition-api.ts` therefore exposes only read capabilities, no `useMutation` hooks.

### 3.2 Client state — Zustand (`competition-store.ts`)

Minimal, UI-only, matching `locale-store.ts`'s precedent (a small, focused store per feature, not one mega-store):

```ts
type CompetitionUiState = {
  showPastMatches: boolean;          // the COMPETITION-1 "past matches" toggle
  togglePastMatches: () => void;
};
```

**Domain rule check:** `LiveSubscriptionState` (model.md §3) is explicitly **not** persisted in this Zustand store — it is internal, transient state owned entirely inside `use-live-competition-subscription.ts` via `useState`/`useRef`, because (a) nothing outside that hook needs to read it directly (the hook's only externally-visible effect is calling `invalidateQueries` on the shared fixture query key), and (b) Zustand stores in this codebase are reserved for state with cross-component-tree sharing needs (`auth-session-store`, `locale-store`) — `LiveSubscriptionState` has exactly one owner/consumer. Promoting it to Zustand would violate the project's existing "one store per genuinely shared concern" discipline without benefit.

### 3.3 Live-update wiring — `use-live-competition-subscription.ts`

```ts
function useLiveCompetitionSubscription(matches: Match[] | undefined): void
```

Mounted once, at the screen level that renders fixture data (Bolt 6's Predictions screen, and/or a future standalone fixture screen) — not globally in `AppProviders`, because `unit-brief.md`'s battery/data-conservation heuristic ("does not poll or hold an active subscription when nothing is live/near-kickoff") is meaningless if the subscription is mounted app-wide regardless of which screen is visible. Internally:

1. Computes `evaluateLiveUpdateRelevance(matches, now)` (domain layer) on every `matches` change.
2. `inactive` → ensures no active channel/poll-interval exists; early-return.
3. `active` → calls `getSupabaseAdapter().subscribeToLiveResults(onSignal)` (new adapter method, §4 below). On receipt of a signal, debounces (domain layer's debounce policy) then calls `queryClient.invalidateQueries({ queryKey: FIXTURE_QUERY_KEY })`.
4. If the adapter reports the subscription failed to establish, starts a `setInterval`-based poll at a fixed reasonable interval (e.g. 30s — exact value finalized in Implement, this is not a story-fixed number) that also invalidates the same query key.
5. `AppState` (RN core) listener: on `background → active` transition, re-runs step 1 from scratch (model.md's "always re-evaluate, never resume stale state" rule) rather than trusting whatever subscription handle predates the backgrounding.
6. Cleanup (`useEffect` return / unmount): unsubscribes the channel and clears any poll interval — no leaked timers/listeners across screen navigation.

This hook lives in `src/shared/competition/hooks/`, not `src/host/`, so that wherever the consuming screen ends up mounted (host's Predictions screen per Bolt 6, or any future remote), the same hook is reused — no duplicated subscription logic per consumer.

## 4. Supabase adapter extension (the encapsulation seam, `requirements.md §7.2`)

New methods on `SupabaseAdapter` (extends the existing interface, same seam Bolt 1/2 already extend release-over-release — no second Supabase-touching module is introduced):

```ts
export interface SupabaseAdapter {
  // ...existing Bolt 1/2 methods unchanged...

  // ── Bolt 5: Competition live-results signal ──
  subscribeToLiveResults(onSignal: () => void): { unsubscribe: () => void } | { failed: true };
}
```

Implementation wraps `this.client.channel('live-results').on('broadcast', { event: 'results-updated' }, () => onSignal()).subscribe(...)` (Supabase Realtime Broadcast, signal-only, no payload — exact channel/event name confirmed against backend contract at Implement time; if it differs, only this one adapter method changes, not any caller). Every other module — `use-live-competition-subscription.ts` included — calls `getSupabaseAdapter().subscribeToLiveResults(...)`, never the Supabase SDK directly, preserving the binding NFR.

## 5. Backend-API client extension (`competition-api.ts`)

Mirrors `profile-api.ts`'s exact pattern — typed wrappers over `getBackendApiClient().request(...)`, one new capability group (`competition.*`), no new transport:

```ts
export const competitionApi = {
  async getFixture(): Promise<Match[]> {
    return getBackendApiClient().request<Match[]>({ capability: 'competition.getFixture' });
  },
};
```

Matches `system-context.md §3`'s "Competition (read)" capability group ("fixture/team/match read model, equivalent to `getFixture`/`getFixtureWithMyPredictions`... Read-only from mobile"). `getFixtureWithMyPredictions` (the prediction-annotated variant) is explicitly **out of this bolt's scope** — `unit-05-predictions` (Bolt 6) owns combining fixture data with the viewer's own predictions; this bolt's `getFixture()` returns plain `Match[]`, never prediction-joined data, keeping the read-model/competition-only boundary clean per `unit-brief.md`'s "Out of scope: triggering sync... manual overrides."

## 6. Navigation

This bolt adds **no new navigator**. Per `unit-brief.md`, COMPETITION-1/2/3 are display data + components consumed by a screen, not a screen-owning story themselves — the "fixture screen" referenced in COMPETITION-1's AC is the one Bolt 6 (Predictions) will register in the host's `AppTree`/`AppStack` (`root-navigator.tsx`). This bolt ships `fixture-list.tsx` and friends as ready-to-mount components/hooks; wiring them into an actual navigator route happens in Bolt 6, consistent with `unit-brief.md`'s framing ("feeds `unit-05-predictions`").

A minimal **temporary host demo screen** is *not* added either (unlike Bolt 0's `education` remote, which needed a "Load remote" button to prove MF wiring) — there is no MF wiring to prove for a `src/shared/` library; Layer 1 component tests exercise `fixture-list.tsx` directly via RNTL `render()`, and Layer 2 device verification (flagged below) is deferred to Bolt 6 once a real navigable screen exists.

## 7. Native modules / new dependencies

- **`@shopify/flash-list`** (new) — first FlashList consumer in the repo (tech-stack.md: "not yet a dependency — add when the first scrolling list is built"). Pure-JS + Reanimated-based; no incremental `pod install` risk beyond what Reanimated/gesture-handler already require (already present via `react-native-gesture-handler`).
- **`react-native-svg`** (already a dependency, Bolt 2/ADR-007) — reused for bundled flag rendering; no new native linking needed.
- No new native push/camera/storage modules.

## 8. Risk carried into Test stage (flagged per coordinator instruction)

COMPETITION-2's Realtime subscription reliability across foreground/background transitions is called out in the bolt's risk profile as needing a **deliberate Layer 2 (device-level) pass**, not just unit tests of the domain/debounce logic. This is recorded here so the Test stage does not treat Layer 1 passing as sufficient closure for COMPETITION-2 — `unit-brief.md`'s own Risks section already says the same: "verify this works reliably on both iOS and Android background/foreground transitions... the polling fallback should not be treated as optional."

## Checkpoint

Pausing here for approval before ADR (recording the placement decision formally as ADR-017, plus any other non-trivial decisions from this design — FlashList adoption, the Realtime-signal adapter extension, the domain/shared two-tier split, deferring grouping computation to render time rather than caching it).
