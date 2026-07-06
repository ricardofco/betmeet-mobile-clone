import { screen } from '@testing-library/react-native';
import { PoolLeaderboardScreen } from '@/remotes/pools/screens/pool-leaderboard-screen';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { rankingsApi } from '@/platform/backend-api/rankings-api';
import type { RankingRow } from '@/domain/rankings';

jest.mock('@/platform/backend-api/rankings-api');
const mockedRankingsApi = rankingsApi as jest.Mocked<typeof rankingsApi>;

function makeRoute(poolId = 'p1') {
  return { params: { poolId } } as any;
}

function makeRow(overrides: Partial<RankingRow> & Pick<RankingRow, 'userId'>): RankingRow {
  return {
    nickname: overrides.userId,
    avatarUrl: null,
    isViewer: false,
    confirmedTotal: 0,
    projectedTotal: null,
    hasConfirmedEntry: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PoolLeaderboardScreen (RANKINGS-2, design.md §7.2)', () => {
  it('shows a loading state while the query is in flight', async () => {
    mockedRankingsApi.getPoolLeaderboard.mockReturnValue(new Promise(() => {}));

    await renderWithQueryClient(<PoolLeaderboardScreen navigation={{} as any} route={makeRoute()} />);

    expect(screen.getByText('Loading leaderboard…')).toBeOnTheScreen();
  });

  it('shows an error state when the query fails', async () => {
    mockedRankingsApi.getPoolLeaderboard.mockRejectedValue(new Error('network down'));

    await renderWithQueryClient(<PoolLeaderboardScreen navigation={{} as any} route={makeRoute()} />);

    expect(await screen.findByText('Could not load this leaderboard.')).toBeOnTheScreen();
  });

  it('shows the NOT_MEMBER copy distinctly from a generic error', async () => {
    mockedRankingsApi.getPoolLeaderboard.mockResolvedValue({ ok: false, error: 'NOT_MEMBER' });

    await renderWithQueryClient(<PoolLeaderboardScreen navigation={{} as any} route={makeRoute()} />);

    expect(
      await screen.findByText('You must be a member of this pool to see its leaderboard.'),
    ).toBeOnTheScreen();
  });

  it('shows the empty state when the pool has no members', async () => {
    mockedRankingsApi.getPoolLeaderboard.mockResolvedValue({ ok: true, isLive: false, rows: [] });

    await renderWithQueryClient(<PoolLeaderboardScreen navigation={{} as any} route={makeRoute()} />);

    expect(await screen.findByText('No members yet.')).toBeOnTheScreen();
  });

  it('renders the CONFIRMED total and no LIVE banner when the response is not live', async () => {
    mockedRankingsApi.getPoolLeaderboard.mockResolvedValue({
      ok: true,
      isLive: false,
      rows: [makeRow({ userId: 'u1', nickname: 'alice#0001', confirmedTotal: 12 })],
    });

    await renderWithQueryClient(<PoolLeaderboardScreen navigation={{} as any} route={makeRoute()} />);

    expect(await screen.findByText('alice#0001')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.queryByText('LIVE')).not.toBeOnTheScreen();
  });

  it('renders the PROJECTED total and a LIVE banner when the response is live', async () => {
    mockedRankingsApi.getPoolLeaderboard.mockResolvedValue({
      ok: true,
      isLive: true,
      rows: [makeRow({ userId: 'u1', nickname: 'alice#0001', confirmedTotal: 5, projectedTotal: 8 })],
    });

    await renderWithQueryClient(<PoolLeaderboardScreen navigation={{} as any} route={makeRoute()} />);

    expect(await screen.findByText('LIVE')).toBeOnTheScreen();
    expect(screen.getByText('8')).toBeOnTheScreen();
    expect(screen.queryByText('5')).not.toBeOnTheScreen();
  });
});
