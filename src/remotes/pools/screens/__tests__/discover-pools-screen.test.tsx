import { screen, userEvent } from '@testing-library/react-native';
import { DiscoverPoolsScreen } from '@/remotes/pools/screens/discover-pools-screen';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { poolsApi } from '@/platform/backend-api/pools-api';
import type { Pool } from '@/domain/pools';

jest.mock('@/platform/backend-api/pools-api');
const mockedPoolsApi = poolsApi as jest.Mocked<typeof poolsApi>;

function makeNavigation() {
  return { navigate: jest.fn(), replace: jest.fn() } as any;
}

function makePool(overrides: Partial<Pool> = {}): Pool {
  return {
    id: 'p1',
    name: 'Copa Publica',
    type: 'PUBLIC',
    capacity: 20,
    memberCount: 5,
    inviteToken: null,
    ownerId: 'owner-1',
    membersCanInvite: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DiscoverPoolsScreen (POOLS-2 join public pool directly)', () => {
  it('shows an empty state with no public pools', async () => {
    mockedPoolsApi.listPublic.mockResolvedValue([]);
    await renderWithQueryClient(<DiscoverPoolsScreen navigation={makeNavigation()} route={{} as any} />);

    expect(await screen.findByText('No public pools yet.')).toBeOnTheScreen();
  });

  it('joins a public pool and navigates to PoolDetail on success (no freeze gate, ADR-033)', async () => {
    mockedPoolsApi.listPublic.mockResolvedValue([makePool()]);
    mockedPoolsApi.joinPublic.mockResolvedValue({ ok: true, poolId: 'p1', alreadyMember: false });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<DiscoverPoolsScreen navigation={navigation} route={{} as any} />);

    const row = await screen.findByText('Copa Publica');
    await user.press(row);

    expect(mockedPoolsApi.joinPublic).toHaveBeenCalledWith('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('PoolDetail', { poolId: 'p1' });
  });

  it('shows a FULL error message without navigating when the pool is full', async () => {
    mockedPoolsApi.listPublic.mockResolvedValue([makePool()]);
    mockedPoolsApi.joinPublic.mockResolvedValue({ ok: false, error: 'FULL' });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<DiscoverPoolsScreen navigation={navigation} route={{} as any} />);

    const row = await screen.findByText('Copa Publica');
    await user.press(row);

    expect(await screen.findByText('This pool is full.')).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
