import { render, screen, userEvent } from '@testing-library/react-native';
import { PoolListItem } from '@/remotes/pools/components/pool-list-item';
import type { Pool, PoolMembership } from '@/domain/pools';

function makePool(overrides: Partial<Pool> = {}): Pool {
  return {
    id: 'p1',
    name: 'Amigos del Mundial',
    type: 'PRIVATE',
    capacity: 10,
    memberCount: 3,
    inviteToken: 'AB3XK9M2',
    ownerId: 'owner-1',
    membersCanInvite: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMembership(overrides: Partial<PoolMembership> = {}): PoolMembership {
  return {
    poolId: 'p1',
    userId: 'owner-1',
    joinedAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

describe('PoolListItem', () => {
  it('renders the pool name, visibility, and member/capacity count', async () => {
    await render(<PoolListItem pool={makePool()} onPress={jest.fn()} />);

    expect(screen.getByText('Amigos del Mundial')).toBeOnTheScreen();
    expect(screen.getByText('Private · 3/10 members')).toBeOnTheScreen();
  });

  it('renders "Public" for a PUBLIC pool', async () => {
    await render(<PoolListItem pool={makePool({ type: 'PUBLIC' })} onPress={jest.fn()} />);
    expect(screen.getByText('Public · 3/10 members')).toBeOnTheScreen();
  });

  it('calls onPress with the pool id when tapped', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<PoolListItem pool={makePool()} onPress={onPress} />);

    await user.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('p1');
  });

  it('shows an "Archived" badge when the viewer membership is archived (POOLS-5)', async () => {
    await render(
      <PoolListItem
        pool={makePool()}
        viewerMembership={makeMembership({ archivedAt: '2026-02-01T00:00:00Z' })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Archived')).toBeOnTheScreen();
  });

  it('does not show an "Archived" badge when the viewer membership is not archived', async () => {
    await render(
      <PoolListItem pool={makePool()} viewerMembership={makeMembership()} onPress={jest.fn()} />,
    );
    expect(screen.queryByText('Archived')).not.toBeOnTheScreen();
  });
});
