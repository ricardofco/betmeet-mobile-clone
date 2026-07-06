import { screen, userEvent } from '@testing-library/react-native';
import { PoolListItem } from '@/remotes/pools/components/pool-list-item';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import type { Pool, PoolMembership } from '@/domain/pools';

// Post-Implement fix (2026-07-06, Layer 2 finding #3): `PoolListItem` now
// calls `useTranslation()` — `renderWithQueryClient` wraps `I18nextProvider`
// (and forces `i18n.language = 'en'` for determinism) + `TamaguiProvider`,
// same as every other retrofitted component in this remote. `QueryClient`
// itself is unused by this component but the helper is the established,
// consistent way to get both providers in one call.

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
    await renderWithQueryClient(<PoolListItem pool={makePool()} onPress={jest.fn()} />);

    expect(screen.getByText('Amigos del Mundial')).toBeOnTheScreen();
    expect(screen.getByText('Private · 3/10 members')).toBeOnTheScreen();
  });

  it('renders "Public" for a PUBLIC pool', async () => {
    await renderWithQueryClient(<PoolListItem pool={makePool({ type: 'PUBLIC' })} onPress={jest.fn()} />);
    expect(screen.getByText('Public · 3/10 members')).toBeOnTheScreen();
  });

  it('calls onPress with the pool id when tapped', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolListItem pool={makePool()} onPress={onPress} />);

    await user.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('p1');
  });

  it('shows an "Archived" badge when the viewer membership is archived (POOLS-5)', async () => {
    await renderWithQueryClient(
      <PoolListItem
        pool={makePool()}
        viewerMembership={makeMembership({ archivedAt: '2026-02-01T00:00:00Z' })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Archived')).toBeOnTheScreen();
  });

  it('does not show an "Archived" badge when the viewer membership is not archived', async () => {
    await renderWithQueryClient(
      <PoolListItem pool={makePool()} viewerMembership={makeMembership()} onPress={jest.fn()} />,
    );
    expect(screen.queryByText('Archived')).not.toBeOnTheScreen();
  });
});
