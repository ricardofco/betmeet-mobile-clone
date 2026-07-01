# ADR-019 — One flat `['competition', 'fixture']` TanStack Query key; day-grouping derived via `select`, never cached

## Context

COMPETITION-1 requires matches grouped into calendar-day buckets with a "today's already-started day stays visible" rule and a 1-hour-before-next-kickoff linger window for the most recent past day (model.md §2, `decidePastDayLingering()`). Two designs were considered:

1. **Cache the grouped `FixtureView` shape directly** — either by having the backend return pre-grouped data, or by computing `FixtureView` once and storing it as the TanStack Query result.
2. **Cache only the flat `Match[]` list, and derive `FixtureView` at read time** via TanStack Query's `select` option (or an equivalent in-hook computation), recomputed on every read against the current wall-clock time.

The grouping/linger decision is a function of **three** inputs: the match list, the viewer's local timezone, and the viewer's current instant (`now`). The first two are effectively static per session; the third — `now` — changes continuously and is not something the server returns or that a cached query result can represent. If `FixtureView` were the cached shape, a `LingerDecision` computed at fetch time (e.g. "show in current") would silently go stale the moment real time crosses the linger threshold, without any new data having arrived from the server to trigger a refetch — the cached object would lie about "now" indefinitely until the next unrelated invalidation.

Additionally, `unit-04-competition` is consumed by more than one future screen (Predictions in Bolt 6, scoring-rankings's match context in Bolt 9, admin's match list in Bolt 10) and `use-profile-query.ts`'s existing precedent (design.md §3.1, originally Bolt 3 design.md §4) establishes the project convention: "Settings screen and wizard both read through the same query key so a mutation in one place invalidates the other." A single shared key for the underlying data, with each consumer deriving its own view, is the established pattern to extend.

## Decision

- **One TanStack Query key**: `FIXTURE_QUERY_KEY = ['competition', 'fixture']`, fetching a flat, ungrouped `Match[]` from `competitionApi.getFixture()`.
- **`FixtureDayGroup`/`FixtureView` are never the cached value.** They are computed by calling the domain layer's `groupMatchesByDay()` and `decidePastDayLingering()` (`src/domain/competition/fixture-day-grouping.ts`, framework-free, ADR-018) inside `use-fixture-query.ts`'s `select` (or equivalent post-fetch transform), passed the live system clock at **render** time — not at fetch time.
- Every screen that needs the grouped view calls the same hook against the same query key; live-signal-triggered refetches (`use-live-competition-subscription.ts`, COMPETITION-2) invalidate this **one** key, refreshing every mounted consumer simultaneously with no duplicate network requests.

## Consequences

- The backend contract stays simple and reusable: `competition.getFixture` returns a flat list (`system-context.md §3`'s "fixture/team/match read model"), with zero day-grouping or timezone logic required server-side — web and mobile can independently apply their own "what is 'today'" interpretation for the same UTC data, which is correct given the two platforms' viewers may be in different timezones for the same server response.
- `FixtureView`'s linger-window state can silently change between renders **without a refetch** (purely because `now` advanced past the threshold), which is the desired behavior — re-running `select` on every render (or on a periodic re-render trigger, finalized in Implement, e.g. a coarse interval timer) is cheap (pure function over an already-fetched list) compared to the alternative of an incorrect, server-fetch-coupled staleness model.
- No additional query key is needed for "grouped fixture" vs. "flat fixture" — avoids the two-keys-can-drift-apart failure mode TanStack Query encourages against.
- Implement stage must ensure the `select`-applied transform is **not** memoized in a way that freezes `now` at first render (e.g. a naive `useMemo` keyed only on `matches` would never re-evaluate `decidePastDayLingering` as time passes); this is called out explicitly here so it isn't silently "optimized" into staleness during Implement.
