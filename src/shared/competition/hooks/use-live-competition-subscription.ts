import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { useInvalidateFixtureQuery } from '@/shared/competition/hooks/use-fixture-query';
import { computeDebounceDeadline, evaluateLiveUpdateRelevance, type Match } from '@/domain/competition';

const DEBOUNCE_WINDOW_MS = 1500;
const POLL_INTERVAL_MS = 30_000;

/**
 * COMPETITION-2's live-update wiring (design.md §3.3, ADR-021). Mounted at
 * the screen level that renders fixture data (not app-wide in
 * `AppProviders`) so the battery/data-conservation heuristic
 * (`evaluateLiveUpdateRelevance`) actually gates real subscription/polling
 * activity rather than running unconditionally regardless of which screen
 * is visible.
 *
 * ADR-021: the polling fallback is started for ANY non-`subscribed` state
 * (explicit failure, or simply not yet attempted because relevance just
 * became active) — never gated behind an explicit SDK error alone. On every
 * foreground transition, the whole decision sequence re-runs from scratch;
 * a pre-backgrounding subscription handle is never trusted as still valid.
 */
export function useLiveCompetitionSubscription(matches: Match[] | undefined): void {
  const invalidateFixtureQuery = useInvalidateFixtureQuery();

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceDeadlineRef = useRef<number | null>(null);
  const matchesRef = useRef<Match[] | undefined>(matches);
  matchesRef.current = matches;

  useEffect(() => {
    let cancelled = false;

    function teardown() {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      debounceDeadlineRef.current = null;
    }

    function scheduleDebouncedRefetch() {
      const nowMs = Date.now();
      const deadline = computeDebounceDeadline(nowMs, DEBOUNCE_WINDOW_MS, debounceDeadlineRef.current);
      debounceDeadlineRef.current = deadline;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        debounceDeadlineRef.current = null;
        debounceTimeoutRef.current = null;
        invalidateFixtureQuery();
      }, deadline - nowMs);
    }

    function startPollingFallback() {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(() => {
        invalidateFixtureQuery();
      }, POLL_INTERVAL_MS);
    }

    async function evaluateAndConnect() {
      teardown();

      const currentMatches = matchesRef.current ?? [];
      const relevance = evaluateLiveUpdateRelevance(currentMatches, new Date().toISOString());

      if (relevance === 'inactive') {
        // Battery/data conservation (unit-brief.md) — no subscription, no
        // polling, when nothing is live or near kickoff.
        return;
      }

      const result = await getSupabaseAdapter().subscribeToLiveResults(() => {
        scheduleDebouncedRefetch();
      });

      if (cancelled) {
        if ('unsubscribe' in result) result.unsubscribe();
        return;
      }

      if ('failed' in result) {
        // ADR-021: any non-established state falls back to polling — not
        // gated behind a specific error type.
        startPollingFallback();
        return;
      }

      unsubscribeRef.current = result.unsubscribe;
    }

    evaluateAndConnect();

    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // ADR-021: unconditional full re-evaluation — never resume a
        // possibly-stale pre-background subscription/poll handle.
        evaluateAndConnect();
      }
    });

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      teardown();
    };
    // Re-running this effect on every `matches` identity change keeps the
    // relevance check current; `evaluateAndConnect` always reads the latest
    // value via `matchesRef`, so a same-render re-entry doesn't tear down a
    // healthy subscription unnecessarily when only the FixtureView's
    // derived shape changed, not the underlying instant.
  }, [matches, invalidateFixtureQuery]);
}
