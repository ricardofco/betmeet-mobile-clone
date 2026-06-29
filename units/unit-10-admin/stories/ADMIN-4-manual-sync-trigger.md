# ADMIN-4 — Manual sync trigger

**Unit:** `unit-10-admin` · **Placement:** Remote

## Story

As an admin, I want to trigger a data sync on demand, so that I don't have to wait for the next scheduled run if I know data needs refreshing now.

## Source rules

`domain-overview.md §5.9`: a manual trigger runs through the exact same orchestration path as the automated scheduler — no separate/divergent logic.

## Acceptance criteria

- The admin can trigger a sync for a specific scope (fixtures/live-status/results/full — matching whichever scopes the backend exposes for manual triggering); the action calls the same backend entrypoint the scheduler uses, never a client-side reimplementation of sync logic.
- A trigger while a sync for that scope/window is already in progress is handled gracefully (the backend's existing lock/idempotency mechanism applies; the UI shows a clear "already running" state rather than allowing a confusing duplicate attempt).
- The dashboard (ADMIN-1) reflects the manually-triggered run once it starts/completes, with no visual distinction implying it's a "different kind" of sync than an automated one (it isn't, by design).

## Dependencies

- ADMIN-1 (the dashboard this populates).
- ADMIN-5 (access gate).
