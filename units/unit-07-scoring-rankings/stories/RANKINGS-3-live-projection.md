# RANKINGS-3 — Live leaderboard projection

**Unit:** `unit-07-scoring-rankings` · **Placement:** Remote

## Story

As a user following a live match, I want to see a projected ranking based on the current live score, so that I get a sense of standings without waiting for the match to officially finish.

## Source rules

`domain-overview.md §5.6`: live projection is never persisted, recomputed on every read; the penalty bonus is **never** granted during projection, even if the live score is tied in a knockout match (only once the match is finished and officially scored).

## Acceptance criteria

- While a match is `LIVE`, both the global ranking and any relevant pool leaderboard show a clearly-labeled "projected" state reflecting the live score.
- A projected calculation for a tied knockout match in progress never adds a penalty-shootout bonus to any user's projected points.
- Once the match transitions to `FINISHED` and is officially scored, the "projected" label disappears and the real, persisted score replaces it — the displayed total may change at that point (this is expected, not a bug, and should not be hidden from the user as a jarring silent change — consider a brief "updated" indicator).

## Dependencies

- `unit-04-competition` (live match status/score).
- RANKINGS-1/RANKINGS-2 (the views this projection overlays onto).
