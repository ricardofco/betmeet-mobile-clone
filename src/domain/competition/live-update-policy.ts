import { isLiveStatus } from '@/domain/competition/match-status';
import type { Match } from '@/domain/competition/fixture-day-grouping';

/**
 * COMPETITION-2's live-update domain rules (model.md §3). Source rule:
 * `domain-overview.md §5.9` — the ±3-hours-of-kickoff-or-already-live
 * quota-saving heuristic, reapplied client-side as the gate for whether
 * mobile bothers subscribing/polling at all (battery/data conservation,
 * unit-brief.md).
 */

export type LiveUpdateRelevance = 'active' | 'inactive';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/**
 * `'active'` exactly when at least one match is `LIVE`, or has a
 * `kickoffAt` within ±3 hours of `now`. Pure function of its inputs — no
 * hidden clock read.
 */
export function evaluateLiveUpdateRelevance(matches: Match[], now: string): LiveUpdateRelevance {
  const nowMs = new Date(now).getTime();

  const isRelevant = matches.some(match => {
    if (isLiveStatus(match.status)) return true;
    if (!match.kickoffAt) return false;
    const kickoffMs = new Date(match.kickoffAt).getTime();
    return Math.abs(kickoffMs - nowMs) <= THREE_HOURS_MS;
  });

  return isRelevant ? 'active' : 'inactive';
}

/**
 * The live-results signal-only broadcast payload (model.md §3,
 * domain-overview.md §6) — deliberately carries no result data, only the
 * fact that *something* changed.
 */
export type LiveSignal = { receivedAt: string };

/**
 * The subscription lifecycle state (model.md §3). No state here is a
 * permanent "give up" terminal value — ADR-021: every non-`inactive`,
 * non-`subscribed` state resolves to `polling-fallback`, never a dead end.
 */
export type LiveSubscriptionState =
  | { type: 'inactive' }
  | { type: 'subscribed' }
  | { type: 'polling-fallback'; intervalMs: number }
  | { type: 'reconnecting' };

/**
 * Pure debounce-window policy for coalescing rapidly-repeated live signals
 * into a single trailing refetch (COMPETITION-2 AC: "debounced so rapid
 * repeated signals don't cause a refetch storm"). Returns the instant
 * (epoch ms) at which the trailing refetch should fire, given the signal's
 * receipt time and any already-pending debounce deadline.
 */
export function computeDebounceDeadline(
  signalReceivedAtMs: number,
  debounceWindowMs: number,
  pendingDeadlineMs: number | null,
): number {
  const candidateDeadline = signalReceivedAtMs + debounceWindowMs;
  if (pendingDeadlineMs === null) return candidateDeadline;
  // A new signal extends/coalesces into one trailing deadline — never
  // schedules a second, independent refetch ahead of the pending one.
  return Math.max(pendingDeadlineMs, candidateDeadline);
}
