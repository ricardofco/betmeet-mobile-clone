import { screen, userEvent } from '@testing-library/react-native';
import { JoinByTokenScreen } from '@/remotes/pools/screens/join-by-token-screen';
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

describe('JoinByTokenScreen (POOLS-2)', () => {
  it('disables submit for an implausible token', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<JoinByTokenScreen navigation={makeNavigation()} route={{} as any} />);

    await user.type(screen.getByLabelText('Invite code'), 'AB');
    expect(screen.getByRole('button', { name: 'Join pool' })).toBeDisabled();
  });

  it('enables submit for a plausible token and joins on press', async () => {
    mockedPoolsApi.joinByToken.mockResolvedValue({ ok: true, poolId: 'p1', alreadyMember: false });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<JoinByTokenScreen navigation={navigation} route={{} as any} />);

    await user.type(screen.getByLabelText('Invite code'), 'ab3xk9m2');
    await user.press(screen.getByRole('button', { name: 'Join pool' }));

    expect(mockedPoolsApi.joinByToken).toHaveBeenCalledWith('AB3XK9M2');
    expect(navigation.replace).toHaveBeenCalledWith('PoolDetail', { poolId: 'p1' });
  });

  it('shows a NOT_FOUND error message for an invalid code', async () => {
    mockedPoolsApi.joinByToken.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<JoinByTokenScreen navigation={navigation} route={{} as any} />);

    await user.type(screen.getByLabelText('Invite code'), 'ZZZZZZZZ');
    await user.press(screen.getByRole('button', { name: 'Join pool' }));

    expect(await screen.findByText('Invalid invite code.')).toBeOnTheScreen();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
