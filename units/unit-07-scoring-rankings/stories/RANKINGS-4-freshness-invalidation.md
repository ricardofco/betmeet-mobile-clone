# RANKINGS-4 — Ranking data freshness and invalidation triggers

**Unit:** `unit-07-scoring-rankings` · **Placement:** Remote

## Story

As a user, I want rankings to reflect recent changes (a finished match, a membership change, an admin correction) promptly, so that I'm not looking at stale standings.

## Source rules

`migration-analysis.md` (caching-layer translation note: `revalidateTag`/`unstable_cache` → client-side query cache, invalidated on the same triggers the web app uses); `domain-overview.md §7` (pools→scoring-rankings dependency: membership changes invalidate the leaderboard).

## Acceptance criteria

- Joining, leaving, or being kicked from a league invalidates that league's cached leaderboard data on the affected user's next view of it.
- A match finishing and being scored (whether by the normal automated path or an admin override, `unit-10-admin`) invalidates both the global ranking and any pool leaderboard containing a prediction for that match.
- The exact cache mechanism (React Query/SWR-equivalent, chosen in Construction) is not fixed here — only the list of triggers that must cause invalidation is fixed, per requirements.md §8.

## Dependencies

- `unit-06-pools` (membership-change trigger).
- `unit-10-admin` (override trigger).
- `unit-04-competition` (match-finished trigger, via the live-results signal).
