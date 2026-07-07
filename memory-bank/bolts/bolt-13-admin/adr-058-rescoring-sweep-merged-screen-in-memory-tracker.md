# ADR-058 — ADMIN-2/3 merge into one honestly-labeled "Rescoring sweep" screen; in-memory-only last-run tracker (confirmed by human checkpoint)

## Status
Accepted (2026-07-06).

## Context

`bolt-backend-phase1/adr-028-phased-backend-build-order.md` explicitly
separated *"Phase 2: admin overrides"* (this bolt) from *"Phase 3:
football-data.org sync orchestration + scoring write + a scheduler"*. Phase
3's *scoring-write* half was built by Bolt 10 as the idempotent, safe-to-call
`sweepFinishedUnscoredMatches()` (ADR-050). Phase 3's *sync-orchestration*
half — the actual football-data.org fetch/scheduler that betmeet-clone's
`actions/trigger-sync.ts` calls (`runScheduledSync`, "the same orchestration
path as the automated scheduler") — was **never built by any bolt** in this
mobile backend. A full grep of `backend/src` confirms zero
`sync|orchestrat|football-data` code exists anywhere (`model.md §4`).

This left ADMIN-2 (sync dashboard, read of `ProviderSyncRun`) and ADMIN-3
(manual sync trigger) with no real underlying mechanism to display or call —
flagged in `model.md §9` item 1 as the single highest-priority open question,
requiring a human decision before Design could proceed on those two stories.
**The Model-stage checkpoint resolved this**: ADMIN-3 is narrowed to a manual
trigger for the already-existing `sweepFinishedUnscoredMatches()`, labeled
honestly in the UI as a re-check/rescoring action, never "sync."

`design.md §1` then designed the consequence of that resolution:

1. `backend/src/services/scoring/score-sweeper.ts` already returns
   `Promise<number>` (count of matches swept), not `void` — the additive
   signature change `model.md §9` anticipated turns out to already be in
   place from Bolt 10's own implementation. No change needed to
   `sweepFinishedUnscoredMatches()` itself.
2. What is genuinely missing is any record of *when* it last ran — the
   function is purely stateless/on-demand; nothing persists a "last run"
   fact anywhere, even though three read endpoints already call it silently
   on every read (ADR-050).
3. ADMIN-2 and ADMIN-3, once narrowed, are mechanically the same thing (a
   read of, and a manual trigger for, the one existing sweep function) —
   modeling them as a dashboard-plus-separate-trigger the way betmeet-clone's
   real `provider_sync_runs`-backed dashboard does would manufacture a
   distinction this backend cannot actually back up.

## Decision

**ADMIN-2 and ADMIN-3 merge into one screen**, `sweep-status-screen.tsx`,
backed by two new backend capabilities that both call
`sweepFinishedUnscoredMatches()` (directly, or read its last recorded
outcome) — never a real sync:

- `admin.getScoringSweepStatus` → `{ lastRunAt, lastSweptCount }`
- `admin.triggerScoringSweep` → invokes the same
  `sweepFinishedUnscoredMatches()` every other read endpoint already calls,
  returns the fresh count + timestamp

A new, tiny, **in-process, non-DB-persisted** tracker,
`backend/src/services/scoring/sweep-status.ts` (~15 lines — module-level
`lastRunAt`/`lastSweptCount` variables, `recordSweepRun()`/`getSweepStatus()`),
is fed by one additive line inside `sweepFinishedUnscoredMatches()` itself
(`recordSweepRun(staleMatches.length)` right before its existing `return`) —
so the tracked "last run" reflects the sweep's **true** last invocation
regardless of what triggered it (an admin's explicit tap, or any user opening
Rankings/Predictions a moment earlier). This is deliberately more honest than
tracking admin-triggered runs only.

**Explicitly NOT built**: any per-run history list/table (betmeet-clone's "25
most recent runs"), any per-scope breakdown (there are no scopes, there being
no provider sync), and no write to `provider_sync_runs` — it stays exactly as
`model.md §3/§8` found it: schema-provisioned, zero consumers, unchanged by
this bolt. `provider_sync_runs` is **not** repurposed to store this tracker
either — a one-row proxy table for an in-memory fact would misrepresent the
table's real (unused) purpose.

Screen copy is deliberately blunt: title "Rescoring sweep" (not "Sync"), with
a description line stating what this does and, as importantly, what it does
**not** do (this app has no connection to any external results feed).

**Human checkpoint confirmation (2026-07-06)**: the in-memory-only tracker
was flagged at the Design checkpoint as a genuine trade-off (resets on
backend restart, not multi-instance-safe) rather than a non-decision. It is
now **CONFIRMED, not merely proposed** — judged the right-sized choice for a
single local Express process with no horizontal-scaling plan
(`tech-stack.md`), where the alternative (a new DB column/table to persist
one timestamp + one count) would be disproportionate scope growth for a
narrowed, honestly-low-stakes read.

## Consequences

- `provider_sync_runs` remains entirely untouched and unused by this bolt —
  any future bolt that builds a real football-data.org sync orchestrator is
  the one that should populate and read it, not this one.
- The sweep-status tracker resets to "never run" on every backend restart,
  and would report inconsistent values across multiple backend instances if
  this service is ever horizontally scaled. This is an accepted, named
  limitation, not a silent gap — if this backend is ever scaled
  horizontally, or if the sweep's "last run" fact becomes something a real
  audit trail depends on, this decision should be revisited (persisting to
  `sweep_status` DB row or similar), not assumed permanent.
- `admin.triggerScoringSweep`'s effect is identical in kind to what already
  happens silently on every `rankings.getGlobalRanking`/
  `getPoolLeaderboard`/`predictions.getMyPredictions` call (ADR-050) — this
  bolt adds no new scoring mechanism, only a manual, admin-visible way to
  invoke the same existing idempotent function and see its outcome.
- If a real sync orchestrator is ever built in a future bolt, this merged
  screen's shape should be re-examined — a real per-scope dashboard reading
  `provider_sync_runs` would then become buildable, and this ADR's "no scopes
  exist" reasoning would no longer hold. Not assumed permanent, same
  discipline every placement-style ADR in this repo applies to its own
  premises.
