import { screen, userEvent } from '@testing-library/react-native';
import { DeleteAccountScreen } from '@/host/settings/screens/delete-account-screen';
import { poolsApi } from '@/platform/backend-api/pools-api';
import { authApi } from '@/platform/backend-api/auth-api';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

jest.mock('@/platform/backend-api/pools-api');
jest.mock('@/platform/backend-api/auth-api');
jest.mock('@/platform/supabase/supabase-adapter');

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof DeleteAccountScreen>[0];
}

describe('DeleteAccountScreen (AUTH-6, model.md §4, ADR-039)', () => {
  const mockedGetOwned = poolsApi.getOwnedPoolsForDeletion as jest.MockedFunction<
    typeof poolsApi.getOwnedPoolsForDeletion
  >;
  const mockedDelete = authApi.deleteAccount as jest.MockedFunction<typeof authApi.deleteAccount>;
  const mockedGetAdapter = getSupabaseAdapter as jest.MockedFunction<typeof getSupabaseAdapter>;
  const signOut = jest.fn();

  beforeEach(() => {
    mockedGetOwned.mockReset();
    mockedDelete.mockReset();
    signOut.mockReset();
    mockedGetAdapter.mockReturnValue({ signOut } as unknown as ReturnType<typeof getSupabaseAdapter>);
  });

  it('disables submit until the confirm phrase is typed exactly', async () => {
    mockedGetOwned.mockResolvedValue([]);
    const user = userEvent.setup();
    await renderWithQueryClient(<DeleteAccountScreen {...buildProps()} />);
    await screen.findByText('Delete account');

    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeDisabled();

    await user.type(screen.getByLabelText('Confirmation phrase'), 'delete my account');
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeEnabled();
  });

  it('requires a successor to be chosen for every pool that has other members', async () => {
    mockedGetOwned.mockResolvedValue([
      { poolId: 'p1', poolName: 'Office League', candidates: [{ userId: 'u2', nickname: 'friend#2222' }] },
    ]);
    const user = userEvent.setup();
    await renderWithQueryClient(<DeleteAccountScreen {...buildProps()} />);
    await screen.findByText('Office League');

    await user.type(screen.getByLabelText('Confirmation phrase'), 'delete my account');
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeDisabled();

    await user.press(screen.getByText('friend#2222'));
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeEnabled();
  });

  it('shows sole-owner pools as "will be deleted", requiring no assignment', async () => {
    mockedGetOwned.mockResolvedValue([{ poolId: 'p1', poolName: 'Solo League', candidates: [] }]);
    const user = userEvent.setup();
    await renderWithQueryClient(<DeleteAccountScreen {...buildProps()} />);
    await screen.findByText(/Solo League/);

    await user.type(screen.getByLabelText('Confirmation phrase'), 'delete my account');
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeEnabled();
  });

  it('calls authApi.deleteAccount with the chosen assignments and signs out on success', async () => {
    mockedGetOwned.mockResolvedValue([
      { poolId: 'p1', poolName: 'Office League', candidates: [{ userId: 'u2', nickname: 'friend#2222' }] },
    ]);
    mockedDelete.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await renderWithQueryClient(<DeleteAccountScreen {...buildProps()} />);
    await screen.findByText('Office League');

    await user.type(screen.getByLabelText('Confirmation phrase'), 'delete my account');
    await user.press(screen.getByText('friend#2222'));
    await user.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(mockedDelete).toHaveBeenCalledWith({
      poolOwnershipAssignments: [{ poolId: 'p1', newOwnerId: 'u2' }],
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('shows an error and does NOT sign out when the server rejects for a missing assignment (failure path)', async () => {
    mockedGetOwned.mockResolvedValue([]);
    mockedDelete.mockResolvedValue({ ok: false, error: 'MISSING_ASSIGNMENT' });
    const user = userEvent.setup();
    await renderWithQueryClient(<DeleteAccountScreen {...buildProps()} />);
    await screen.findByText('Delete account');

    await user.type(screen.getByLabelText('Confirmation phrase'), 'delete my account');
    await user.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(await screen.findByText('Choose a new owner for every pool listed below.')).toBeOnTheScreen();
    expect(signOut).not.toHaveBeenCalled();
  });
});
