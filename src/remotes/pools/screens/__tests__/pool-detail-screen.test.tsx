import { screen, userEvent } from '@testing-library/react-native';
import { PoolDetailScreen } from '@/remotes/pools/screens/pool-detail-screen';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { poolsApi } from '@/platform/backend-api/pools-api';
import type { Pool, PoolMember, PoolMembership } from '@/domain/pools';

jest.mock('@/platform/backend-api/pools-api');
const mockedPoolsApi = poolsApi as jest.Mocked<typeof poolsApi>;

function makeNavigation() {
  return { navigate: jest.fn(), replace: jest.fn(), popToTop: jest.fn() } as any;
}

function makeRoute(poolId = 'p1') {
  return { params: { poolId } } as any;
}

function makePool(overrides: Partial<Pool> = {}): Pool {
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
    ...overrides,
  };
}

function makeMember(overrides: Partial<PoolMember> = {}): PoolMember {
  return { userId: 'owner-1', nickname: 'owner#0001', isOwner: true, joinedAt: '2026-01-01T00:00:00Z', ...overrides };
}

function makeMembership(overrides: Partial<PoolMembership> = {}): PoolMembership {
  return { poolId: 'p1', userId: 'owner-1', joinedAt: '2026-01-01T00:00:00Z', archivedAt: null, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PoolDetailScreen (POOLS-2/POOLS-4/POOLS-5)', () => {
  it('shows a not-found state when the pool does not exist', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    expect(await screen.findByText('Pool not found.')).toBeOnTheScreen();
  });

  it('renders pool name, members, and the invite panel for the owner', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember(), makeMember({ userId: 'member-1', nickname: 'jugador#0042', isOwner: false })],
      viewerMembership: makeMembership(),
    });
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    expect(await screen.findByText('Amigos del Mundial')).toBeOnTheScreen();
    expect(screen.getByText('owner#0001')).toBeOnTheScreen();
    expect(screen.getByText('jugador#0042')).toBeOnTheScreen();
    expect(screen.getByText('AB3XK9M2')).toBeOnTheScreen();
  });

  it('shows "Pool settings" and hides "Leave pool" for the owner', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember()],
      viewerMembership: makeMembership(),
    });
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByText('Amigos del Mundial');
    expect(screen.getByRole('button', { name: 'Pool settings' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Leave pool' })).not.toBeOnTheScreen();
  });

  it('shows "Leave pool" and hides "Pool settings" for a non-owner member', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember(), makeMember({ userId: 'member-1', nickname: 'jugador#0042', isOwner: false })],
      viewerMembership: makeMembership({ userId: 'member-1' }),
    });
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByText('Amigos del Mundial');
    expect(screen.getByRole('button', { name: 'Leave pool' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pool settings' })).not.toBeOnTheScreen();
  });

  it('the owner cannot kick themself but can kick another member (model.md §6)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember(), makeMember({ userId: 'member-1', nickname: 'jugador#0042', isOwner: false })],
      viewerMembership: makeMembership(),
    });
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByText('Amigos del Mundial');
    // Exactly one Kick button — for the non-owner member row, not the owner's own row.
    expect(screen.getAllByRole('button', { name: 'Kick' })).toHaveLength(1);
  });

  it('leaving succeeds regardless of competition/tournament state (ADR-033 — no freeze gate)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember(), makeMember({ userId: 'member-1', nickname: 'jugador#0042', isOwner: false })],
      viewerMembership: makeMembership({ userId: 'member-1' }),
    });
    mockedPoolsApi.leavePool.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByText('Amigos del Mundial');
    await user.press(screen.getByRole('button', { name: 'Leave pool' }));

    // No "in-progress"/competition-state argument is ever passed to leavePool —
    // it is called with only the poolId, proving this screen never gates the
    // action on tournament state (regression companion to the backend's own
    // ADR-033 curl verification).
    expect(mockedPoolsApi.leavePool).toHaveBeenCalledWith('p1');
    expect(mockedPoolsApi.leavePool).toHaveBeenCalledTimes(1);
  });

  it('kicking succeeds regardless of competition/tournament state (ADR-033 — no freeze gate)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember(), makeMember({ userId: 'member-1', nickname: 'jugador#0042', isOwner: false })],
      viewerMembership: makeMembership(),
    });
    mockedPoolsApi.kickMember.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByText('Amigos del Mundial');
    await user.press(screen.getByRole('button', { name: 'Kick' }));

    expect(mockedPoolsApi.kickMember).toHaveBeenCalledWith({ poolId: 'p1', targetUserId: 'member-1' });
  });

  it('toggles archive state via the Archive/Unarchive button (POOLS-5)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({
      ok: true,
      pool: makePool(),
      members: [makeMember()],
      viewerMembership: makeMembership({ archivedAt: null }),
    });
    mockedPoolsApi.setArchived.mockResolvedValue({ ok: true, archived: true });
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolDetailScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByText('Amigos del Mundial');
    await user.press(screen.getByRole('button', { name: 'Archive' }));

    expect(mockedPoolsApi.setArchived).toHaveBeenCalledWith({ poolId: 'p1', archived: true });
  });
});
