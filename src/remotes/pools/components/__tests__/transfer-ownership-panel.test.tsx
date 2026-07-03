import { screen, userEvent } from '@testing-library/react-native';
import { TransferOwnershipPanel } from '@/remotes/pools/components/transfer-ownership-panel';
import { poolsApi } from '@/platform/backend-api/pools-api';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import type { PoolMember } from '@/domain/pools';

jest.mock('@/platform/backend-api/pools-api');

const MEMBERS: PoolMember[] = [
  { userId: 'owner-1', nickname: 'owner#0001', isOwner: true, joinedAt: '2026-01-01T00:00:00Z' },
  { userId: 'member-1', nickname: 'friend#2222', isOwner: false, joinedAt: '2026-01-02T00:00:00Z' },
];

describe('TransferOwnershipPanel (POOLS-7, ADR-040)', () => {
  const mockedTransfer = poolsApi.transferOwnership as jest.MockedFunction<typeof poolsApi.transferOwnership>;

  beforeEach(() => {
    mockedTransfer.mockReset();
  });

  it('renders nothing when the owner is the only member', async () => {
    const { toJSON } = await renderWithQueryClient(
      <TransferOwnershipPanel poolId="p1" members={[MEMBERS[0]]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('lists every non-owner member as a transfer candidate', async () => {
    await renderWithQueryClient(<TransferOwnershipPanel poolId="p1" members={MEMBERS} />);
    expect(screen.getByText('friend#2222')).toBeOnTheScreen();
    expect(screen.queryByText('owner#0001')).not.toBeOnTheScreen();
  });

  it('disables the transfer button until a candidate is selected', async () => {
    await renderWithQueryClient(<TransferOwnershipPanel poolId="p1" members={MEMBERS} />);
    expect(screen.getByRole('button', { name: 'Transfer ownership' })).toBeDisabled();
  });

  it('calls poolsApi.transferOwnership with the selected candidate', async () => {
    mockedTransfer.mockResolvedValue({ ok: true });
    const onTransferred = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<TransferOwnershipPanel poolId="p1" members={MEMBERS} onTransferred={onTransferred} />);

    await user.press(screen.getByText('friend#2222'));
    await user.press(screen.getByRole('button', { name: 'Transfer ownership' }));

    expect(mockedTransfer).toHaveBeenCalledWith({ poolId: 'p1', newOwnerId: 'member-1' });
    await screen.findByText('friend#2222');
    expect(onTransferred).toHaveBeenCalledTimes(1);
  });

  it('shows an error on INVALID_TARGET rejection (failure path)', async () => {
    mockedTransfer.mockResolvedValue({ ok: false, error: 'INVALID_TARGET' });
    const user = userEvent.setup();
    await renderWithQueryClient(<TransferOwnershipPanel poolId="p1" members={MEMBERS} />);

    await user.press(screen.getByText('friend#2222'));
    await user.press(screen.getByRole('button', { name: 'Transfer ownership' }));

    expect(await screen.findByText('Choose a current member to transfer to.')).toBeOnTheScreen();
  });
});
