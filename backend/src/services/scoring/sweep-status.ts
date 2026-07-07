/**
 * ADMIN-2/3's merged "Rescoring sweep" screen (design.md §1.2, ADR-058) —
 * a tiny, in-process, NON-DB-persisted tracker of the last time
 * `sweepFinishedUnscoredMatches()` actually ran, regardless of what
 * triggered it (an admin's explicit tap via `admin.triggerScoringSweep`, or
 * any user opening Rankings/Predictions a moment earlier — every one of
 * those call sites already invokes the sweep silently, ADR-050).
 *
 * Deliberately NOT persisted to `provider_sync_runs` or any new DB
 * column/table (ADR-058's Consequences) — resets to "never run" on every
 * backend restart and would be inconsistent across multiple backend
 * instances if this service were ever horizontally scaled. Judged
 * proportionate for a single local Express process with no such scaling on
 * the horizon (tech-stack.md); revisit if that stops being true.
 */
let lastRunAt: Date | null = null;
let lastSweptCount: number | null = null;

export function recordSweepRun(count: number, at: Date = new Date()): void {
  lastRunAt = at;
  lastSweptCount = count;
}

export function getSweepStatus(): { lastRunAt: Date | null; lastSweptCount: number | null } {
  return { lastRunAt, lastSweptCount };
}
