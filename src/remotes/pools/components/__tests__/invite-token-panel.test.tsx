import { render, screen, userEvent } from '@testing-library/react-native';
import { InviteTokenPanel } from '@/remotes/pools/components/invite-token-panel';
import type { PoolForInvitePermission } from '@/domain/pools';

function makePool(overrides: Partial<PoolForInvitePermission> = {}): PoolForInvitePermission {
  return { type: 'PRIVATE', membersCanInvite: true, ...overrides };
}

describe('InviteTokenPanel (model.md §5 canInvite gating)', () => {
  it('renders the invite token for the owner', async () => {
    await render(<InviteTokenPanel pool={makePool()} inviteToken="AB3XK9M2" viewerIsOwner={true} />);
    expect(screen.getByText('AB3XK9M2')).toBeOnTheScreen();
  });

  it('renders the invite token for any member of a PUBLIC pool', async () => {
    await render(
      <InviteTokenPanel pool={makePool({ type: 'PUBLIC', membersCanInvite: false })} inviteToken="AB3XK9M2" viewerIsOwner={false} />,
    );
    expect(screen.getByText('AB3XK9M2')).toBeOnTheScreen();
  });

  it('renders for a PRIVATE-pool member when membersCanInvite is true', async () => {
    await render(
      <InviteTokenPanel pool={makePool({ type: 'PRIVATE', membersCanInvite: true })} inviteToken="AB3XK9M2" viewerIsOwner={false} />,
    );
    expect(screen.getByText('AB3XK9M2')).toBeOnTheScreen();
  });

  it('renders nothing for a PRIVATE-pool member when membersCanInvite is false', async () => {
    const { toJSON } = await render(
      <InviteTokenPanel pool={makePool({ type: 'PRIVATE', membersCanInvite: false })} inviteToken="AB3XK9M2" viewerIsOwner={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when inviteToken is null (non-member viewing a public-directory row)', async () => {
    const { toJSON } = await render(
      <InviteTokenPanel pool={makePool({ type: 'PUBLIC' })} inviteToken={null} viewerIsOwner={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('calls onCopy with the token and shows "Copied!" feedback when the copy button is pressed', async () => {
    const onCopy = jest.fn();
    const user = userEvent.setup();
    await render(<InviteTokenPanel pool={makePool()} inviteToken="AB3XK9M2" viewerIsOwner={true} onCopy={onCopy} />);

    await user.press(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledWith('AB3XK9M2');
    expect(screen.getByText('Copied!')).toBeOnTheScreen();
  });
});
