# PREDICTIONS-4 — Reset a pool override

**Unit:** `unit-05-predictions` · **Placement:** Host

## Story

As a league member, I want to remove my league-specific override and revert to my global prediction for a match, so that I don't have to manually re-type it.

## Source rules

`domain-overview.md` (pools/predictions interplay) — resetting an override deletes only that override row; the member's global prediction for that match becomes what's shown/used for that league again.

## Acceptance criteria

- A "reset to global" action is available wherever a pool-scoped override exists, and only there (not shown if no override exists for that match in that league).
- After reset, the league's prediction view for that match shows the user's current global prediction (or "no prediction" if none exists), not a blank/error state.
- The league's leaderboard reflects the reset on next read (cache invalidation, however Construction implements it, must cover this case — flagged as an explicit requirement, not assumed automatic).

## Dependencies

- PREDICTIONS-3.
- `unit-07-scoring-rankings` (leaderboard cache/data must reflect the reset).
