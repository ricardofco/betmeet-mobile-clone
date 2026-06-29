# RANKINGS-2 — League (pool) leaderboard

**Unit:** `unit-07-scoring-rankings` · **Placement:** Remote

## Story

As a league member, I want to see how I rank within just that league, so that I can compare myself to people I actually know/compete with directly.

## Source rules

`domain-overview.md §5.3`/`§5.6`: a pool leaderboard counts a member's points only for matches whose kickoff is **after** they joined the league — not their full global history.

## Acceptance criteria

- A league's leaderboard uses the same dense-ranking display as the global ranking (RANKINGS-1), scoped to that league's members only.
- A member who joined partway through the tournament shows a total that excludes any match that kicked off before they joined — verified with a test case for a late-joining member.
- A pool-scoped prediction override (where one exists) is used for that league's leaderboard in preference to the member's global prediction for the same match.

## Dependencies

- `unit-06-pools` (membership + `joinedAt`).
- RANKINGS-1 (shared dense-rank display logic).
