# ADR-050 — Lazy sweep-on-read is this backend's only score-finalization trigger mechanism

## Status
Accepted (2026-07-06).

## Context

`model.md §6` (BR-6.8) records betmeet-clone's three real trigger points for
`scoreMatch`/`scoreFinishedUnscoredMatches`: (a) the competition-sync job
marking a match `FINISHED`, (b) a backstop sweep run on a schedule, safe to
run repeatedly, and (c) an admin override re-triggering `scoreMatch` for one
match. Trigger (a) presumes a competition-sync cron — **this mobile backend
has no such infrastructure at all**: Bolt 5's `SupabaseAdapter` only *reads*
live results via Realtime broadcast, it never marks a match `FINISHED`
itself, and no scheduled job exists anywhere in `backend/src` (confirmed by
grep, `model.md §6`). This is a real architectural gap relative to
betmeet-clone, not a mobile-specific simplification of an existing
mechanism — `model.md §6` flagged it as a genuine open question for Design,
not something to silently assume away.

The checkpoint (`model.md §8` item 3) confirmed the resolution: **lazy sweep
on read**. `design.md §4.2` elaborates the concrete shape.

Three options were on the table at Model stage:

1. **Lazy sweep invoked by the rankings-read endpoints** (pull-based) — no
   new infrastructure, simplest given no cron exists yet.
2. **A dedicated backend script**, akin to
   `backend/src/scripts/seed-competition.ts` — requires a human or external
   scheduler to actually invoke it; doesn't solve "score data is fresh the
   first time a user opens a ranking screen" on its own.
3. **Defer real automatic triggering until Bolt 13 (Admin) exists**,
   treating this bolt's sweep as manually invokable only — leaves rankings
   screens showing stale/unscored data indefinitely until an admin acts,
   unacceptable given RANKINGS-1/2 are this bolt's own primary deliverable.

Option 1 was chosen. It requires zero new cron/scheduler infrastructure (this
backend has none, and adding one solely for this bolt would be scope creep
beyond what any story requests), and it makes the freshness guarantee hold
exactly when a user is looking at the data that would otherwise be stale —
the same "safe to run repeatedly" contract betmeet-clone's own
`scoreFinishedUnscoredMatches` already documents (`model.md §6`).

## Decision

A single shared, idempotent `sweepFinishedUnscoredMatches()`
(`backend/src/services/scoring/score-sweeper.ts`) is invoked, **before**
aggregating/returning data, by:

1. `rankings.getGlobalRanking`
2. `rankings.getPoolLeaderboard`
3. `predictions.getMyPredictions` — a **Design-stage elaboration beyond the
   checkpoint's literal scope** (`design.md §4.2`), added so a prediction's
   `pointsStatus` (§8 below) is accurate the very first time a user opens
   Predictions after a match finishes, not only after they've separately
   visited a ranking screen first. This is the same sweep function, one more
   caller — no new trigger *mechanism* is introduced, and this is flagged
   explicitly as an elaboration, not a re-litigation of the checkpoint
   decision.

The sweep query is an efficient, idempotent scan: `Match.status ===
'FINISHED' AND homeScore/awayScore NOT NULL AND` no matching
`prediction_scores` row exists for at least one of its predictions — calling
`scoreMatch(matchId)` (`backend/src/services/scoring/score-match.ts`) per
stale match found. No new cron, no new script, no new scheduler dependency.

## Consequences

- Rankings/predictions data is guaranteed fresh **at read time**, not on a
  fixed schedule — a match that finishes while no user is looking at any of
  these three endpoints simply gets scored the next time any of them is
  called, with no user-visible staleness once someone does look.
- The sweep runs on every call to three endpoints, including ones that don't
  themselves need fresh scores for most requests (the common case: nothing
  stale to sweep) — an accepted, small, idempotent-query cost on every read,
  not a bottleneck given the query is a targeted, indexed scan, not a full
  table scan of all matches.
- When Bolt 13 (Admin) is built, its "rescoring trigger" (`model.md §0`'s
  RANKINGS-4 identity evidence) calls the same underlying `scoreMatch`
  function directly for one match — it does not need to invoke or duplicate
  this sweep, since the sweep's job is finding *unnoticed* stale matches, not
  re-scoring a specific, admin-identified one.
- If a real competition-sync cron is ever added to this backend (closing the
  gap this ADR works around), the lazy sweep does not need to be removed —
  it remains a valid, cheap backstop even in the presence of a cron, exactly
  as it already is in betmeet-clone alongside its own real sync job
  (`model.md §6`'s trigger (b)). This ADR's decision is additive, not one
  that would need reversing if cron infrastructure arrives later.
