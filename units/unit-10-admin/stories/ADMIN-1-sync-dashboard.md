# ADMIN-1 — Sync dashboard

**Unit:** `unit-10-admin` · **Placement:** Remote

## Story

As an admin, I want to see the recent history and current status of the external data sync, so that I can tell whether the fixture/result data is fresh and trustworthy.

## Source rules

`domain-overview.md §5.9`/`§5.7`; `project-inventory.md §6` (`ProviderSyncRun` fields: scope, status, timestamps, item counts, error message).

## Acceptance criteria

- The dashboard shows, per sync scope, the most recent successful run's timestamp and a reasonably-sized list of recent runs (status, scope, item counts, error message if failed).
- A rate-limited or failed run is visually distinguishable from a successful one.
- This screen is read-only — no action is taken from here directly (triggering a sync is ADMIN-4, a separate, explicit action).

## Dependencies

- Backend sync-dashboard read contract.
- ADMIN-5 (access gate).
