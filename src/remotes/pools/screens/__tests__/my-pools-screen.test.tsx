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
});
