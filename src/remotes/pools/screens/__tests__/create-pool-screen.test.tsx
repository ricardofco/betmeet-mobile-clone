import { screen, userEvent } from '@testing-library/react-native';
import { CreatePoolScreen } from '@/remotes/pools/screens/create-pool-screen';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { poolsApi } from '@/platform/backend-api/pools-api';

jest.mock('@/platform/backend-api/pools-api');
const mockedPoolsApi = poolsApi as jest.Mocked<typeof poolsApi>;

function makeNavigation() {
  return { navigate: jest.fn(), replace: jest.fn() } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CreatePoolScreen (POOLS-1)', () => {
  it('disables submit until the name and capacity are valid', async () => {
    await renderWithQueryClient(<CreatePoolScreen navigation={makeNavigation()} route={{} as any} />);
    expect(screen.getByRole('button', { name: 'Create pool' })).toBeDisabled();
  });

  it('creates a pool and navigates to PoolDetail on success', async () => {
    mockedPoolsApi.createPool.mockResolvedValue({
      ok: true,
      pool: {
        id: 'p1',
        name: 'My League',
        type: 'PRIVATE',
        capacity: 10,
        memberCount: 1,
        inviteToken: 'AB3XK9M2',
        ownerId: 'owner-1',
        membersCanInvite: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<CreatePoolScreen navigation={navigation} route={{} as any} />);

    await user.type(screen.getByLabelText('Pool name'), 'My League');
    await user.clear(screen.getByLabelText('Capacity'));
    await user.type(screen.getByLabelText('Capacity'), '10');

    await user.press(screen.getByRole('button', { name: 'Create pool' }));

    expect(mockedPoolsApi.createPool).toHaveBeenCalledWith({
      name: 'My League',
      type: 'PRIVATE',
      capacity: 10,
      membersCanInvite: true,
    });
    expect(navigation.replace).toHaveBeenCalledWith('PoolDetail', { poolId: 'p1' });
  });

  it('shows a NAME_TAKEN error without navigating', async () => {
    mockedPoolsApi.createPool.mockResolvedValue({ ok: false, error: 'NAME_TAKEN' });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<CreatePoolScreen navigation={navigation} route={{} as any} />);

    await user.type(screen.getByLabelText('Pool name'), 'Taken Name');
    await user.clear(screen.getByLabelText('Capacity'));
    await user.type(screen.getByLabelText('Capacity'), '10');
    await user.press(screen.getByRole('button', { name: 'Create pool' }));

    expect(await screen.findByText('A public pool with this name already exists.')).toBeOnTheScreen();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
