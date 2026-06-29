# PREDICTIONS-3 — Pool-scoped prediction override and dual-save

**Unit:** `unit-05-predictions` · **Placement:** Host

## Story

As a member of a league, I want to optionally set a different prediction just for that league while keeping my global prediction separate, so that I can play differently across leagues if I want to.

## Source rules

`domain-overview.md §3` (a `Prediction` can be global or pool-scoped) and `§5.4` (a pool override and a global prediction can be saved together atomically — "save as global too").

## Acceptance criteria

- From within a league's prediction view, the user can set a prediction that applies only to that league, distinct from their global prediction for the same match.
- An optional "also save as my global prediction" toggle, when enabled, writes both the pool-scoped and the global prediction in one atomic operation — either both succeed or neither does (no partially-applied state).
- The user must be a member of the league to save a pool-scoped prediction for it (enforced server-side regardless of client state).
- The UI clearly distinguishes "this is your global prediction" from "this is your override for this league" wherever both could be visible.

## Dependencies

- PREDICTIONS-1.
- `unit-06-pools` (membership check).
