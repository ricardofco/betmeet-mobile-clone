import { screen, userEvent } from '@testing-library/react-native';
import { MyPoolsScreen } from '@/remotes/pools/screens/my-pools-screen';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { poolsApi } from '@/platform/backend-api/pools-api';
import type { PoolSummary } from '@/domain/pools';

jest.mock('@/platform/backend-api/pools-api');
const mockedPoolsApi = poolsApi as jest.Mocked<typeof poolsApi>;

function makeNavigation() {
  return { navigate: jest.fn(), replace: jest.fn(), popToTop: jest.fn() } as any;
}

function makeSummary(overrides: Partial<PoolSummary> = {}): PoolSummary {
  return {
    id: 'p1',
    name: 'Amigos del Mundial',
    type: 'PRIVATE',
    capacity: 10,
    memberCount: 2,
    inviteToken: 'AB3XK9M2',
    ownerId: 'owner-1',
    membersCanInvite: true,
    createdAt: '2026-01-01T00:00:00Z',
    viewerMembership: { poolId: 'p1', userId: 'owner-1', joinedAt: '2026-01-01T00:00:00Z', archivedAt: null },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyPoolsScreen', () => {
  it('shows a loading state while pools are fetching', async () => {
    mockedPoolsApi.getMine.mockReturnValue(new Promise(() => {}));
    const navigation = makeNavigation();
    await renderWithQueryClient(<MyPoolsScreen navigation={navigation} route={{} as any} />);

    expect(screen.queryByText("You haven't joined any pools yet.")).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Create a pool' })).not.toBeOnTheScreen();
  });

  it('shows an empty state when the viewer has no pools', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    const navigation = makeNavigation();
    await renderWithQueryClient(<MyPoolsScreen navigation={navigation} route={{} as any} />);

    expect(await screen.findByText("You haven't joined any pools yet.")).toBeOnTheScreen();
  });

  it('shows an error state on fetch failure', async () => {
    mockedPoolsApi.getMine.mockRejectedValue(new Error('network error'));
    const navigation = makeNavigation();
    await renderWithQueryClient(<MyPoolsScreen navigation={navigation} route={{} as any} />);

    expect(await screen.findByText("Couldn't load your pools.")).toBeOnTheScreen();
  });

  it('renders each pool and navigates to PoolDetail on press', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([makeSummary()]);
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<MyPoolsScreen navigation={navigation} route={{} as any} />);

    const row = await screen.findByText('Amigos del Mundial');
    await user.press(row);
    expect(navigation.navigate).toHaveBeenCalledWith('PoolDetail', { poolId: 'p1' });
  });

  it('navigates to CreatePool/DiscoverPools/JoinByToken from the action buttons', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<MyPoolsScreen navigation={navigation} route={{} as any} />);

    await screen.findByText("You haven't joined any pools yet.");

    await user.press(screen.getByRole('button', { name: 'Create a pool' }));
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePool');

    await user.press(screen.getByRole('button', { name: 'Discover public pools' }));
    expect(navigation.navigate).toHaveBeenCalledWith('DiscoverPools');

    await user.press(screen.getByRole('button', { name: 'Join by code' }));
    expect(navigation.navigate).toHaveBeenCalledWith('JoinByToken');
  });

  // Change-2026-07-08 (item 4, My Pools redesign) — the 3 stacked full-width
  // `PrimaryButton`s were replaced with a row of equal-weight, icon-labeled
  // `ActionCard`s (`src/shared/design/primitives.tsx`). The test above
  // already proves each action is independently tappable-and-correctly-wired
  // (unchanged by the redesign, since `ActionCard` is queried the same way a
  // `PrimaryButton` was — `accessibilityRole="button"` + its computed
  // accessible name, per this repo's query-by-role-over-testID convention).
  // This test adds the one thing that convention doesn't already cover: that
  // there are exactly 3 of them, together, as a single row of cards — not 2,
  // not 4, not a stray extra action reintroduced by a future edit — since
  // `getByRole` alone can't distinguish "3 correct actions" from "3 correct
  // actions plus a 4th unrelated one".
  it('renders exactly 3 tappable action cards (Create/Discover/Join by code)', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    const navigation = makeNavigation();
    await renderWithQueryClient(<MyPoolsScreen navigation={navigation} route={{} as any} />);

    await screen.findByText("You haven't joined any pools yet.");

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Create a pool' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Discover public pools' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Join by code' })).toBeOnTheScreen();
  });
});
