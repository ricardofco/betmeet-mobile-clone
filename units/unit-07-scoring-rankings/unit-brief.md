# Unit Brief — `unit-07-scoring-rankings`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Remote (requirements.md §7.4 — rankings screens are not the app's home).

## Purpose

Display global and per-league rankings, including a live projection during in-progress matches, sourced from the backend's authoritative (server-persisted) scoring.

## Source rules

`domain-overview.md §5.6` (ranking rules — dense ranking, live-projection penalty-bonus exclusion), `§4.1`/`§5.7` (when scores get (re)computed, relevant as read-triggers for this unit even though computation itself is server-side).

## In scope

- Global ranking display, **dense ranking** ("1, 1, 2" — tied entries share a rank, next rank increments by exactly one) — this is a deliberate product decision, not to be "corrected" to a different ranking scheme.
- Per-league leaderboard display, scoped to: only matches whose kickoff is after the member joined (not their full global history).
- Live projection: while a match is in progress, recompute a projected leaderboard using the live score, **never** granting the penalty bonus during projection (only once the match is finished and officially scored).
- Refreshing ranking data on the same live-results signal `unit-04-competition` subscribes to (or its own equivalent subscription/poll) — rankings change whenever a match finishes or an admin override re-scores a match.

## Out of scope

- The scoring algorithm itself (`unit-03-scoring`).
- Persisting scores (entirely server-side).
- Triggering rescoring (cron-driven or admin-driven — `unit-10-admin`'s concern for the manual path, server-side for the automatic path).

## Dependencies

- **Depends on:** `unit-03-scoring` (algorithm, for any client-side context/preview), `unit-04-competition` (match status/live-results signal), `unit-06-pools` (membership/joinedAt for pool-scoped leaderboards).
- **Depended on by:** `unit-05-predictions` (resolved-points display), `unit-08-notifications` (rank-improvement events are emitted server-side around scoring, but this unit's read model is what a "see your new rank" deep link would open into).

## Native modules

None.

## Backend contract needed

Global ranking, pool leaderboard, and their live-projection equivalents, per `system-context.md §3` "Rankings".

## Unit-level acceptance criteria

- Tied users always share the same displayed rank, and the rank sequence never "skips" entries the way a standard competition-ranking ("1,1,3") would — verify against a written test case with at least one tie.
- A live-in-progress match's projected points for any affected user never include a penalty-shootout bonus, even if the live data already shows a tied score and a hypothetical shootout in progress.
- A pool leaderboard for a member who joined partway through the tournament excludes points from matches that kicked off before they joined.

## Risks

- Cache/data freshness after a membership change (join/leave/kick) or an admin override must be explicit, not assumed — flagged in RANKINGS-4.

## Stories

See `stories/`: RANKINGS-1 through RANKINGS-4.
