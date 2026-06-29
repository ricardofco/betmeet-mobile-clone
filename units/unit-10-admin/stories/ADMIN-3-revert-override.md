# ADMIN-3 — Revert a match override

**Unit:** `unit-10-admin` · **Placement:** Remote

## Story

As an admin, I want to undo a manual override I made in error, so that the match can be repopulated correctly by the next provider sync.

## Source rules

`domain-overview.md §4.1`/`§5.7`: reverting clears the manual data and resets the match to `SCHEDULED` unconditionally — it does **not** restore the provider's original result (not snapshotted); this also removes the resulting `PredictionScore`s, effectively retracting points users had earned from the manual result.

## Acceptance criteria

- The revert action is available only on a currently-overridden match.
- On confirmation, the match returns to a clean `SCHEDULED` state with no score/winner/penalty data, and all scores derived from the manual result are removed (rankings update accordingly).
- The UI explicitly warns, before confirmation, that this clears rather than restores data, and that a subsequent sync is needed to get the real result back — this must not be a one-tap-no-confirmation action given its impact on user-visible points.

## Dependencies

- ADMIN-2 (the state this reverts).
- `unit-07-scoring-rankings` (score removal/rank update).
- ADMIN-5 (access gate).
