# COMPETITION-2 — Live score updates

**Unit:** `unit-04-competition` · **Placement:** Remote or shared

## Story

As a user watching a live match, I want the score on screen to update without me manually refreshing, so that I can follow the match in real time.

## Source rules

`domain-overview.md §6` (live-update strategy): the backend emits a signal-only "something changed, refetch" broadcast (no result payload) because the hosting model can't hold a long-lived per-client connection; the web app additionally uses a ±3-hour-of-kickoff heuristic to decide when it's worth polling/subscribing aggressively at all.

## Acceptance criteria

- While viewing a screen with a `LIVE` match, the app subscribes to the live-results signal channel (via the Supabase encapsulation adapter, `system-context.md §2`) and refetches that screen's data on receipt, debounced so rapid repeated signals don't cause a refetch storm.
- When no match is live and none is within the ±3-hour window, the app does not poll or hold an active subscription (battery/data conservation, mirroring the web app's quota-saving heuristic).
- If the Realtime subscription fails to establish (network issue, backgrounded app), a polling fallback at a reasonable interval keeps live scores eventually-consistent rather than silently stale.
- Backgrounding and foregrounding the app re-establishes the subscription/polling correctly (no permanently-stale state after a backgrounding cycle).

## Dependencies

- Supabase Realtime via the encapsulation adapter.
- Backend fixture read endpoint (for the refetch itself).
