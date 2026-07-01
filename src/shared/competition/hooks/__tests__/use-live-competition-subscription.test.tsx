import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useLiveCompetitionSubscription } from '@/shared/competition/hooks/use-live-competition-subscription';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { useInvalidateFixtureQuery } from '@/shared/competition/hooks/use-fixture-query';
import type { Match } from '@/domain/competition';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

jest.mock('@/shared/competition/hooks/use-fixture-query', () => ({
  useInvalidateFixtureQuery: jest.fn(),
}));

const mockAdapter = {
  subscribeToLiveResults: jest.fn(),
};

const mockInvalidate = jest.fn();

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phaseId: 'group-stage',
    kickoffAt: null,
    status: 'SCHEDULED',
    homeTeam: null,
    awayTeam: null,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

/**
 * COMPETITION-2 / ADR-021. Layer 1 exercises the debounce/relevance/fallback
 * decision logic with a mocked adapter and mocked AppState events —
 * real Realtime-channel behavior and true OS-level backgrounding are
 * explicitly deferred to Layer 2 device verification (design.md §8,
 * unit-brief.md Risks, ADR-021's own consequence note).
 */
describe('useLiveCompetitionSubscription (COMPETITION-2, ADR-021)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
    (useInvalidateFixtureQuery as jest.Mock).mockReturnValue(mockInvalidate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not subscribe when no match is live or within ±3 hours of kickoff (battery/data conservation)', async () => {
    const matches = [makeMatch({ id: 'm1', kickoffAt: '2030-01-01T00:00:00Z', status: 'SCHEDULED' })];

    const { unmount } = await renderHook(() => useLiveCompetitionSubscription(matches));

    expect(mockAdapter.subscribeToLiveResults).not.toHaveBeenCalled();

    await act(async () => {
      await unmount();
    });
  });

  it('subscribes when a match is LIVE', async () => {
    mockAdapter.subscribeToLiveResults.mockResolvedValue({ unsubscribe: jest.fn() });
    const matches = [makeMatch({ id: 'm1', status: 'LIVE' })];

    const { unmount } = await renderHook(() => useLiveCompetitionSubscription(matches));

    expect(mockAdapter.subscribeToLiveResults).toHaveBeenCalledTimes(1);

    await act(async () => {
      await unmount();
    });
  });

  it('falls back to polling when the subscription fails to establish (ADR-021: not error-only-gated)', async () => {
    mockAdapter.subscribeToLiveResults.mockResolvedValue({ failed: true });
    const matches = [makeMatch({ id: 'm1', status: 'LIVE' })];

    const { unmount } = await renderHook(() => useLiveCompetitionSubscription(matches));

    expect(mockInvalidate).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await unmount();
    });
  });

  it('debounces rapid repeated live signals into a single trailing refetch (COMPETITION-2 AC)', async () => {
    let onSignal: () => void = () => {};
    mockAdapter.subscribeToLiveResults.mockImplementation(async (cb: () => void) => {
      onSignal = cb;
      return { unsubscribe: jest.fn() };
    });
    const matches = [makeMatch({ id: 'm1', status: 'LIVE' })];

    const { unmount } = await renderHook(() => useLiveCompetitionSubscription(matches));

    await act(async () => {
      onSignal();
      jest.advanceTimersByTime(500);
      onSignal(); // a second signal within the debounce window
      jest.advanceTimersByTime(500);
      onSignal(); // a third signal within the debounce window
      jest.advanceTimersByTime(1500);
    });

    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await unmount();
    });
  });

  it('unsubscribes and clears timers on unmount (no leaked timers/listeners)', async () => {
    const unsubscribe = jest.fn();
    mockAdapter.subscribeToLiveResults.mockResolvedValue({ unsubscribe });
    const matches = [makeMatch({ id: 'm1', status: 'LIVE' })];

    const { unmount } = await renderHook(() => useLiveCompetitionSubscription(matches));

    await act(async () => {
      await unmount();
    });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates from scratch on every foreground transition, never resuming a stale subscription handle (ADR-021 AC #4)', async () => {
    mockAdapter.subscribeToLiveResults.mockResolvedValue({ unsubscribe: jest.fn() });
    const matches = [makeMatch({ id: 'm1', status: 'LIVE' })];

    const { unmount } = await renderHook(() => useLiveCompetitionSubscription(matches));

    expect(mockAdapter.subscribeToLiveResults).toHaveBeenCalledTimes(1);

    const appStateListener = (AppState.addEventListener as jest.Mock).mock.calls.find(
      call => call[0] === 'change',
    )?.[1];
    expect(appStateListener).toBeDefined();

    await act(async () => {
      appStateListener('active');
    });

    // A fresh evaluate-and-connect cycle re-subscribes rather than reusing
    // the previous handle.
    expect(mockAdapter.subscribeToLiveResults).toHaveBeenCalledTimes(2);

    await act(async () => {
      await unmount();
    });
  });
});
