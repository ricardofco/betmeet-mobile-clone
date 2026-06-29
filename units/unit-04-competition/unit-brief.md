# Unit Brief — `unit-04-competition`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Remote or shared (requirements.md §7.4 — read-only, feeds `unit-05-predictions`).

## Purpose

Read-only access to competition/phase/team/match data on mobile. The football-data.org sync, the provider adapter, and all sync orchestration stay **100% server-side** regardless of this migration — this unit only consumes the resulting data and keeps it fresh on-screen.

## Source rules

`domain-overview.md §4.1` (match status state machine), `§5.9` (competition data & external sync — the parts relevant to a *consumer*, not the sync internals), `§6` (live-update strategy: signal-only Realtime broadcast + refetch, chosen because the hosting model can't hold a long-lived socket per client).

## In scope

- Reading the active competition's phases, teams, and matches (fixture list), grouped by calendar day in the viewer's local timezone.
- Displaying match status (`SCHEDULED`/`LOCKED`/`LIVE`/`FINISHED`/`POSTPONED`/`CANCELLED`) and live scores.
- Team display data: name, FIFA trigram code (not ISO 3166-1 alpha-3 — footballing convention), flag.
- Subscribing to the live-results signal (Realtime broadcast, no payload — "something changed, refetch") and refetching the affected screen's data on receipt.
- A polling fallback (or primary mechanism, Construction's call) using the same "is anything within ±3 hours of kickoff or already live" heuristic the web app uses to decide when to poll aggressively vs. not at all.

## Out of scope

- Triggering or configuring the sync itself (cron jobs, the football-data.org adapter, `ProviderSyncRun` writes) — entirely server-side, not mobile's concern even for admin (admin's *manual trigger* capability is `unit-10-admin`, which calls a backend endpoint, not anything in this unit).
- Manual result overrides (`unit-10-admin`).

## Dependencies

- **Depends on:** `unit-01-auth` (session required to read fixture data, per the source app's route gating — `/matches`-equivalent screens require auth).
- **Depended on by:** `unit-05-predictions` (fixture data + team data), `unit-07-scoring-rankings` (match data for live projection context), `unit-10-admin` (admin's match-list view, though admin's own unit owns the override actions).

## Native modules

- `react-native-svg` if flags are rendered as SVG (Construction may instead ship flags as raster assets — open implementation choice, not fixed here).

## Backend contract needed

Fixture/team/match read model equivalent to the web app's `getFixture`/`getFixtureWithMyPredictions` (`system-context.md §3` "Competition (read)").

## Unit-level acceptance criteria

- The fixture view reflects the same day-grouping and "today's already-started matches stay visible" logic as the web app (calendar-day boundary, not kickoff time).
- A live match's score updates on screen within a reasonable delay after the backend's data changes, via the Realtime-signal-and-refetch pattern (or polling fallback) — no requirement for sub-second websocket-level latency.
- Country flags/codes match the web app's hand-maintained FIFA-trigram convention, not raw ISO codes (avoids the England/Scotland/Wales-aren't-ISO-countries problem the web app already solved).

## Risks

- Realtime-broadcast-and-refetch requires a working Supabase Realtime subscription from the RN client (via the encapsulation adapter, `system-context.md §2`) — verify this works reliably on both iOS and Android background/foreground transitions before relying on it as the sole live-update mechanism; the polling fallback should not be treated as optional.

## Stories

See `stories/`: COMPETITION-1 through COMPETITION-3.
