# Bolt 5 — Competition Read Model — Model Stage

> **Stage 1 of 5 (Model).** DDD domain modeling, framework-free, no UI. Checkpoint: pause for approval before Design.

## Scope recap

This bolt covers **COMPETITION-1** (fixture read model grouped by day), **COMPETITION-2** (live score updates via Realtime signal-and-refetch + polling fallback), **COMPETITION-3** (team/flag display data — FIFA trigram convention). Source: `units/unit-04-competition/unit-brief.md` and its three stories.

This unit is **read-only**. The football-data.org sync, the provider adapter, all sync orchestration, and any mutation of `Match`/`Team`/`Competition` rows stay 100% server-side (`unit-brief.md` "Out of scope"). This bolt only models the shapes mobile consumes and the client-side rules for grouping/display/refresh — never a sync mechanism.

This bolt depends on Bolt 1 (Auth core — session required, `unit-brief.md` "Depends on"). It does **not** depend on Bolt 4 (Scoring), but `Match`/`Team` data modeled here is consumed by Bolt 6 (Predictions) and later Bolt 9 (Scoring & rankings) — this model must not invent shapes that would need breaking changes once those bolts arrive.

## 1. Core entities (read-only projections, `domain-overview.md §3`)

This bolt does not own these entities (the backend does) — it models mobile's **read-only view** of them, scoped to exactly the fields COMPETITION-1/2/3 need to render.

```ts
type Team = {
  id: string;
  fifaCode: string;        // FIFA trigram — NOT ISO 3166-1 alpha-3 (COMPETITION-3, domain-overview.md §8)
  name: string;             // full display name
  flagKey: string;          // key into the bundled flag-asset map (COMPETITION-3) — NOT a URL
};

type Match = {
  id: string;
  phaseId: string;
  kickoffAt: string | null;           // ISO-8601 UTC; null only for unresolved knockout slots
  status: MatchStatus;
  homeTeam: Team | KnockoutPlaceholder | null;
  awayTeam: Team | KnockoutPlaceholder | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
};

type KnockoutPlaceholder = {
  kind: 'placeholder';
  label: string;            // e.g. "Winner of Round of 16 Match 3" (COMPETITION-1 AC)
};

type MatchStatus =
  | 'SCHEDULED'
  | 'LOCKED'
  | 'LIVE'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED';
```

**Domain rule — `MatchStatus` is consumed, never computed client-side** (`domain-overview.md §4.1`): all six values, including the derived `LOCKED` fallback, originate from the backend's fixture read model. Mobile renders whichever status it is given; it does not run the provider-sync state machine (terminal-status guard, manual-override freeze) locally. This mirrors `domain-overview.md §4.2`'s "server re-checks with its own clock — the client's countdown UI is a courtesy" pattern: mobile's status display is a courtesy mirror of server-authoritative state, never a second source of truth.

**`homeTeam`/`awayTeam` as a tagged union, not nullable `Team`:** COMPETITION-1's AC ("matches with unresolved knockout slots show a placeholder... rather than blank teams") requires the UI to distinguish "no team assigned yet, here's a descriptive label" from "team data failed to load" from "a real team." Modeling this as `Team | KnockoutPlaceholder | null` makes all three states explicit and exhaustively switchable, rather than relying on a `team === null` check that can't tell "future TBD slot" from "data error."

## 2. `FixtureDayGroup` — the day-partitioning value object (COMPETITION-1)

This is the central new domain concept this bolt introduces. Source rule: `domain-overview.md §4.1`/`§5.9` via the unit-brief — "today's already-started matches stay visible (split by calendar day, not by kickoff time), and the most-recent past day's last kickoff slot lingers visible until 1 hour before the next kickoff before dropping behind a 'past matches' toggle."

```ts
type FixtureDayGroup = {
  calendarDate: string;     // YYYY-MM-DD in the viewer's LOCAL timezone — the grouping key
  matches: Match[];         // matches whose localized kickoff falls on this calendar day
};

type FixtureView = {
  currentAndUpcoming: FixtureDayGroup[];   // visible by default
  past: FixtureDayGroup[];                 // behind the "past matches" toggle
};
```

**Domain rule — grouping key is the viewer's local calendar day, not kickoff-time-relative buckets** (COMPETITION-1 AC #1). A match kicking off at 23:50 local time and another at 00:10 the next local day belong to *different* day groups even though they are 20 minutes apart — the grouping function partitions by calendar date after timezone conversion, never by a sliding time window.

**Domain rule — "a day that has already started stays in current/upcoming until the calendar day ends"** (COMPETITION-1 AC #2). Precisely: a `FixtureDayGroup` belongs to `currentAndUpcoming` if `calendarDate >= today's calendarDate` in the viewer's local timezone, regardless of whether every match in that group has already kicked off. A group only moves to `past` once its `calendarDate < today's calendarDate`.

**Domain rule — the lingering-visibility grace window** (`unit-brief.md`/`COMPETITION-1` source rules): "the most-recent past day's last kickoff slot lingers visible until 1 hour before the next kickoff before dropping behind the past-matches toggle." Modeled as a pure function of three inputs — no new stored state:

```ts
type LingerDecision = 'show-in-current' | 'move-to-past';

function decidePastDayLingering(
  mostRecentPastDayLastKickoffAt: string,  // ISO-8601, ends the most-recent fully-past calendar day
  nextUpcomingKickoffAt: string | null,    // ISO-8601 of the next match overall, or null if none
  now: string,                              // ISO-8601, viewer's current instant
): LingerDecision
```

This is evaluated **only** against the single most-recent past day (the calendar day immediately before today's group) — earlier past days are unconditionally `past`. The function returns `'show-in-current'` exactly while `now < nextUpcomingKickoffAt - 1h` (or `nextUpcomingKickoffAt === null`, since there is then nothing to count down to and the day stays visible); otherwise `'move-to-past'`.

**Domain rule — grouping is computed client-side from a flat match list, not requested pre-grouped.** The backend's `getFixture`-equivalent read model (`system-context.md §3`) returns a flat, timezone-agnostic match list (UTC `kickoffAt`); the day-partitioning, local-timezone conversion, and linger decision are pure mobile-side domain functions over that list. This keeps the backend contract simple/reusable (web's "today" and mobile's "today" can differ by timezone for the same UTC instant) and matches the project's general pattern of pure-function domain logic operating on dumb data (cf. `scoring`, `auth-guard`).

## 3. `LiveUpdatePolicy` — the ±3-hour heuristic and subscription lifecycle (COMPETITION-2)

Source rule: `domain-overview.md §5.9`/`§6` — "signal-only Realtime broadcast (no payload) because the hosting model can't hold a long-lived per-client connection," plus the web app's "±3-hours-of-kickoff or already-live" quota-saving heuristic for deciding when polling/subscribing is worth doing at all.

```ts
type LiveUpdateRelevance = 'active' | 'inactive';

/**
 * `active` exactly when at least one match in the current fixture view is
 * `LIVE`, or has a `kickoffAt` within ±3 hours of `now` (domain-overview.md
 * §5.9's LIVE_STATUS sync-scope heuristic, reapplied client-side as the
 * gate for whether mobile bothers subscribing/polling at all).
 */
function evaluateLiveUpdateRelevance(matches: Match[], now: string): LiveUpdateRelevance
```

**`LiveSignalChannel` — the signal-only broadcast contract, mobile's view of it:**

```ts
type LiveSignal = { receivedAt: string };  // no payload beyond "something changed" — domain-overview.md §5.9/§6

type LiveSubscriptionState =
  | { type: 'inactive' }                                          // evaluateLiveUpdateRelevance === 'inactive': no subscription, no polling
  | { type: 'subscribed' }                                        // Realtime channel established, listening
  | { type: 'polling-fallback'; intervalMs: number }               // Realtime failed/unavailable; reasonable-interval polling instead
  | { type: 'reconnecting' };                                      // foreground transition, re-establishing
```

**Domain rule — debounced refetch, not one refetch per signal.** COMPETITION-2 AC: "refetches that screen's data on receipt, debounced so rapid repeated signals don't cause a refetch storm." Modeled as a pure debounce policy: a `LiveSignal` received while a debounce window is already open extends/coalesces into a single trailing refetch, never queues N refetches for N signals. This is a generic temporal value, not specific to competition data — same shape as `ResendCooldown`'s "window" concept from Bolt 1, applied to outbound refetch triggers instead of an inbound rate limit.

**Domain rule — polling fallback is not optional, and is not merely a Realtime-failure path.** Per `unit-brief.md`'s Risks section ("the polling fallback should not be treated as optional") and COMPETITION-2 AC #3, the fallback exists for any condition that leaves the Realtime channel unestablished — network issue, app backgrounded, or simple unavailability — not just an explicit SDK error. `LiveSubscriptionState` therefore has no "permanently broken, give up" terminal state; `reconnecting` always leads back to either `subscribed` or `polling-fallback`, never to a dead end.

**Domain rule — backgrounding/foregrounding always re-evaluates from scratch, never assumes prior state is still valid** (COMPETITION-2 AC #4). On foreground, the policy re-runs `evaluateLiveUpdateRelevance` against current data (which may have changed while backgrounded) before deciding `subscribed` vs `polling-fallback` vs `inactive` — it does not simply "resume" the pre-background `LiveSubscriptionState`.

## 4. `FifaTeamDisplay` — team/flag display rules (COMPETITION-3)

Source rule: `domain-overview.md §5.9`/`§8` — "ISO 3-letter code" in this product means the FIFA trigram, not ISO 3166-1 alpha-3; England/Scotland/Wales use UK-subdivision flags (`gb-eng`/`gb-sct`/`gb-wls`), not invalid "country" flags.

```ts
type FifaTrigram = string;  // 3-letter footballing code, e.g. "GER", "NED", "ENG" — distinct value-space from ISO 3166-1 alpha-3

/**
 * Maps a team's `flagKey` (backend-provided, COMPETITION-3 dependency on
 * COMPETITION-1's display data) to the bundled flag asset's lookup key.
 * `flagKey` is NOT assumed to equal `fifaCode` 1:1 (UK home nations have one
 * FIFA trigram each — ENG/SCO/WAL — but their flag asset key follows the
 * `lipis/flag-icons` subdivision convention `gb-eng`/`gb-sct`/`gb-wls`, per
 * project-inventory.md's `Team.flagKey` field existing as a separate column
 * from `fifaCode` for exactly this reason).
 */
type FlagAssetKey = string;  // e.g. "de", "nl", "gb-eng", "gb-sct", "gb-wls"
```

**Domain rule — `fifaCode` and `flagKey` are two independent identifiers on `Team`, never derived from one another client-side.** The backend (hand-maintained seed list per `domain-overview.md §5.9`) is the single source of truth for both; mobile's display logic looks up the bundled flag asset by `flagKey`, and renders `fifaCode` as on-screen text — it never attempts to compute one from the other (e.g. never assumes "flag asset filename = lowercase fifaCode," which would be wrong for the four UK entries).

**Domain rule — flags are bundled, not fetched** (COMPETITION-3 AC #3, `migration-analysis.md` "flags should likely ship as bundled assets rather than remote SVGs"). The `FlagAssetKey → asset` mapping is a static, build-time table; there is no runtime flag-fetch path and no flag URL ever appears in the `Team` read model mobile consumes — this is a structural absence (the type has no `flagUrl` field), not just a convention.

**Domain rule — missing flag asset key is a build-time/data defect, not a runtime fallback case to design around.** Since the asset set is bundled and the four-UK-nations problem is already solved by the backend's seed list (`domain-overview.md §5.9`), this bolt's display logic does not need a "show generic fallback flag" state for any team expected to appear in the World Cup 2026 roster — COMPETITION-3 AC #2 requires the UK entries to render correctly, not gracefully degrade.

## 5. Ubiquitous language glossary

| Term | Precise meaning in this bolt (binding for Design/ADR/Implement/Test) |
|---|---|
| **Fixture** | The full set of `Match` rows for the active `Competition`, as read (never written) by mobile. |
| **Day group** (`FixtureDayGroup`) | Matches partitioned by the viewer's **local calendar date**, not kickoff-time windows. |
| **Current/upcoming view** | The `FixtureDayGroup[]` shown by default — today's group (even if already started) and all future days, plus any past day still within its linger window. |
| **Past view** | The `FixtureDayGroup[]` behind the explicit "past matches" toggle. |
| **Linger window** | The ≤1-hour-before-next-kickoff grace period during which the most-recent past day's group stays in the current/upcoming view instead of moving to past. |
| **Knockout placeholder** | A `Match.homeTeam`/`awayTeam` slot with no team assigned yet, rendered with a descriptive label (e.g. "Winner of Round of 16 Match 3") instead of a blank/missing team. |
| **FIFA trigram** | The 3-letter footballing-convention team code (`Team.fifaCode`) — explicitly **not** ISO 3166-1 alpha-3; the two code spaces diverge for England/Scotland/Wales. |
| **Flag asset key** | `Team.flagKey` — an independent identifier from `fifaCode`, used to look up a bundled (never remote) flag asset; follows the `lipis/flag-icons` UK-subdivision convention for the four home nations. |
| **Live-update relevance** | The `active`/`inactive` classification of "is anything live or within ±3 hours of kickoff" — gates whether mobile subscribes/polls at all (battery/data conservation). |
| **Live signal** | The Realtime broadcast payload mobile receives: a bare "something changed" notification with no result data, per `domain-overview.md §6`'s hosting-constraint rationale. |
| **Debounced refetch** | The policy that coalesces rapidly-repeated live signals into a single trailing refetch rather than one refetch per signal. |
| **Polling fallback** | The non-optional reasonable-interval polling mechanism that keeps live data eventually-consistent whenever the Realtime subscription is not established (failure, background, or otherwise) — not merely an error-path afterthought. |

## Explicitly not modeled in this bolt

- The football-data.org provider adapter, sync orchestration, cron scheduling, `ProviderSyncRun` audit states (`domain-overview.md §4.7`) — entirely server-side, out of `unit-04-competition`'s scope per its unit brief.
- Manual result overrides / admin's force-result and revert-override actions (`unit-10-admin`) — this bolt only renders whatever status/score the backend currently reports, including an admin-overridden one; it does not model the override mechanics themselves.
- Predictions' consumption of this fixture/team data (`unit-05-predictions`, Bolt 6) — this bolt models the read shapes those screens will need, but does not build the prediction form, eligibility countdown, or penalty-winner UI.
- The scoring algorithm and resolved-points display (Bolt 4 `shared/scoring`, Bolt 9 rankings) — `Match.homeScore`/`awayScore` are modeled here purely as display data, not as scoring inputs.
- Concrete navigator/screen names, TanStack Query key shapes, Zustand store boundaries, Module Federation host-vs-remote placement, or the concrete Supabase Realtime channel name/payload schema — all Design-stage decisions about *where these types live and how they're wired*, not what they *mean*.
- The backend capability contract's exact request/response wire shape (`getFixture`/`getFixtureWithMyPredictions` equivalent, `system-context.md §3`) — this bolt models the domain shapes mobile needs; the concrete REST/RPC contract is a backend/Construction-pairing concern, mocked at this bolt's Layer 1 boundary same as Bolt 1/3's `profile.*`/`auth.*` capabilities were.

## Checkpoint

Pausing here for approval before Design (component/data-flow design: where `FixtureDayGroup`/`LiveSubscriptionState`/`FifaTeamDisplay` physically live in `src/domain/competition/`, the TanStack Query key + Zustand boundary for live-subscription state, the host-vs-federated-remote placement per `requirements.md §7.4` "competition: Remote or shared," and how the Supabase Realtime signal channel attaches to the `SupabaseAdapter` seam).
