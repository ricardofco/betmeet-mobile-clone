import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { PoolSettingsScreen } from '@/remotes/pools/screens/pool-settings-screen';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { poolsApi } from '@/platform/backend-api/pools-api';
import type { Pool } from '@/domain/pools';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PoolSettingsScreen (POOLS-1 delete / POOLS-4 rename+visibility+membersCanInvite)', () => {
  it('renames the pool', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool(), members: [], viewerMembership: null });
    mockedPoolsApi.renamePool.mockResolvedValue({ ok: true, name: 'New Name' });
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolSettingsScreen navigation={makeNavigation()} route={makeRoute()} />);

    const input = await screen.findByLabelText('Pool name');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.press(screen.getByRole('button', { name: 'Save name' }));

    expect(mockedPoolsApi.renamePool).toHaveBeenCalledWith({ poolId: 'p1', name: 'New Name' });
  });

  it('shows a NAME_TAKEN error on rename failure', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool(), members: [], viewerMembership: null });
    mockedPoolsApi.renamePool.mockResolvedValue({ ok: false, error: 'NAME_TAKEN' });
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolSettingsScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByLabelText('Pool name');
    await user.press(screen.getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('A public pool with this name already exists.')).toBeOnTheScreen();
  });

  it('toggles visibility PRIVATE -> PUBLIC (allowed at any time, ADR-033)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ type: 'PRIVATE' }), members: [], viewerMembership: null });
    mockedPoolsApi.updateVisibility.mockResolvedValue({ ok: true, type: 'PUBLIC' });
    await renderWithQueryClient(<PoolSettingsScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByLabelText('Pool name');
    fireEvent(screen.getByLabelText('Public pool'), 'change', { nativeEvent: { value: true } });

    await waitFor(() =>
      expect(mockedPoolsApi.updateVisibility).toHaveBeenCalledWith({ poolId: 'p1', type: 'PUBLIC' }),
    );
  });

  it('only shows the membersCanInvite toggle for a PRIVATE pool', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ type: 'PUBLIC' }), members: [], viewerMembership: null });
    await renderWithQueryClient(<PoolSettingsScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByLabelText('Pool name');
    expect(screen.queryByLabelText('Members can invite')).not.toBeOnTheScreen();
  });

  it('toggles membersCanInvite for a PRIVATE pool', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ type: 'PRIVATE', membersCanInvite: true }), members: [], viewerMembership: null });
    mockedPoolsApi.updateMembersCanInvite.mockResolvedValue({ ok: true, membersCanInvite: false });
    await renderWithQueryClient(<PoolSettingsScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByLabelText('Pool name');
    fireEvent(screen.getByLabelText('Members can invite'), 'change', { nativeEvent: { value: false } });

    await waitFor(() =>
      expect(mockedPoolsApi.updateMembersCanInvite).toHaveBeenCalledWith({ poolId: 'p1', membersCanInvite: false }),
    );
  });

  it('deletes the pool and navigates back on success (allowed at any time, ADR-033)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool(), members: [], viewerMembership: null });
    mockedPoolsApi.deletePool.mockResolvedValue({ ok: true });
    const navigation = makeNavigation();
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolSettingsScreen navigation={navigation} route={makeRoute()} />);

    await screen.findByLabelText('Pool name');
    await user.press(screen.getByRole('button', { name: 'Delete pool' }));

    expect(mockedPoolsApi.deletePool).toHaveBeenCalledWith('p1');
    expect(navigation.popToTop).toHaveBeenCalled();
  });

  it('never mentions a transfer flow — delete is the only ownership-exit affordance (model.md §10, Bolt 8 scope note)', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool(), members: [], viewerMembership: null });
    await renderWithQueryClient(<PoolSettingsScreen navigation={makeNavigation()} route={makeRoute()} />);

    await screen.findByLabelText('Pool name');
    expect(screen.queryByRole('button', { name: /transfer/i })).not.toBeOnTheScreen();
  });
});
