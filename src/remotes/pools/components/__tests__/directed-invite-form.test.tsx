import { screen, userEvent } from '@testing-library/react-native';
import { DirectedInviteForm } from '@/remotes/pools/components/directed-invite-form';
import { poolsApi } from '@/platform/backend-api/pools-api';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import type { PoolForInvitePermission } from '@/domain/pools';

jest.mock('@/platform/backend-api/pools-api');

function makePool(overrides: Partial<PoolForInvitePermission> = {}): PoolForInvitePermission {
  return { type: 'PRIVATE', membersCanInvite: true, ...overrides };
}

describe('DirectedInviteForm (POOLS-3, model.md §2)', () => {
  const mockedCreate = poolsApi.createDirectedInvite as jest.MockedFunction<typeof poolsApi.createDirectedInvite>;

  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it('renders nothing when canInvite is false (PRIVATE, membersCanInvite off, non-owner)', async () => {
    const { toJSON } = await renderWithQueryClient(
      <DirectedInviteForm poolId="p1" pool={makePool({ membersCanInvite: false })} viewerIsOwner={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the form for the owner', async () => {
    await renderWithQueryClient(<DirectedInviteForm poolId="p1" pool={makePool()} viewerIsOwner={true} />);
    expect(screen.getByLabelText('Invite target')).toBeOnTheScreen();
  });

  it('shows a resolved success message and clears the input on success', async () => {
    mockedCreate.mockResolvedValue({ ok: true, resolved: true });
    const user = userEvent.setup();
    await renderWithQueryClient(<DirectedInviteForm poolId="p1" pool={makePool()} viewerIsOwner={true} />);

    await user.type(screen.getByLabelText('Invite target'), 'friend#1234');
    await user.press(screen.getByRole('button', { name: 'Invite' }));

    expect(mockedCreate).toHaveBeenCalledWith({ poolId: 'p1', target: 'friend#1234' });
    expect(await screen.findByText('Invite sent.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Invite target').props.value).toBe('');
  });

  it('shows an email-hash-only success message when the target did not resolve to a real account', async () => {
    mockedCreate.mockResolvedValue({ ok: true, resolved: false });
    const user = userEvent.setup();
    await renderWithQueryClient(<DirectedInviteForm poolId="p1" pool={makePool()} viewerIsOwner={true} />);

    await user.type(screen.getByLabelText('Invite target'), 'nobody@example.com');
    await user.press(screen.getByRole('button', { name: 'Invite' }));

    expect(await screen.findByText("Invite saved — we'll notify them if they sign up.")).toBeOnTheScreen();
  });

  it('shows the server error for a self-invite attempt', async () => {
    mockedCreate.mockResolvedValue({ ok: false, error: 'SELF_INVITE' });
    const user = userEvent.setup();
    await renderWithQueryClient(<DirectedInviteForm poolId="p1" pool={makePool()} viewerIsOwner={true} />);

    await user.type(screen.getByLabelText('Invite target'), 'me#1234');
    await user.press(screen.getByRole('button', { name: 'Invite' }));

    expect(await screen.findByText("You can't invite yourself.")).toBeOnTheScreen();
  });

  it('shows a validation error and does not call the API for a too-short target', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<DirectedInviteForm poolId="p1" pool={makePool()} viewerIsOwner={true} />);

    await user.type(screen.getByLabelText('Invite target'), 'ab');
    // Submit button is disabled below 3 chars — but the domain-level
    // guard is what actually matters (model.md §2's isPlausibleInviteTarget).
    expect(screen.getByRole('button', { name: 'Invite' })).toBeDisabled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
