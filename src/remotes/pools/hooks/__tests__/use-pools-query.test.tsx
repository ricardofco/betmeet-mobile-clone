import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import {
  useMyPoolsQuery,
  usePublicPoolsQuery,
  usePoolDetailQuery,
  useCreatePoolMutation,
  useRenamePoolMutation,
  useDeletePoolMutation,
  useUpdateVisibilityMutation,
  useUpdateMembersCanInviteMutation,
  useJoinByTokenMutation,
  useJoinPublicMutation,
  useLeavePoolMutation,
  useKickMemberMutation,
  useSetArchivedMutation,
} from '@/remotes/pools/hooks/use-pools-query';
import { poolsApi } from '@/platform/backend-api/pools-api';
import type { Pool, PoolSummary } from '@/domain/pools';

jest.mock('@/platform/backend-api/pools-api');

const mockedPoolsApi = poolsApi as jest.Mocked<typeof poolsApi>;

function makePool(overrides: Partial<Pool> & { id: string }): Pool {
  return {
    name: 'Test Pool',
    type: 'PRIVATE',
    capacity: 10,
    memberCount: 1,
    inviteToken: 'AB3XK9M2',
    ownerId: 'owner-1',
    membersCanInvite: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSummary(overrides: Partial<PoolSummary> & { id: string }): PoolSummary {
  return {
    ...makePool(overrides),
    viewerMembership: { poolId: overrides.id, userId: 'owner-1', joinedAt: '2026-01-01T00:00:00Z', archivedAt: null },
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useMyPoolsQuery / usePublicPoolsQuery / usePoolDetailQuery (design.md §6)', () => {
  it('fetches my pools via poolsApi.getMine', async () => {
    const pools = [makeSummary({ id: 'p1' })];
    mockedPoolsApi.getMine.mockResolvedValue(pools);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => useMyPoolsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(pools));
  });

  it('fetches public pools via poolsApi.listPublic', async () => {
    const pools = [makePool({ id: 'p1', type: 'PUBLIC', inviteToken: null })];
    mockedPoolsApi.listPublic.mockResolvedValue(pools);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => usePublicPoolsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(pools));
  });

  it('fetches pool detail via poolsApi.getDetail, keyed per poolId', async () => {
    const response = {
      ok: true as const,
      pool: makePool({ id: 'p1' }),
      members: [],
      viewerMembership: null,
    };
    mockedPoolsApi.getDetail.mockResolvedValue(response);
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(() => usePoolDetailQuery('p1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(mockedPoolsApi.getDetail).toHaveBeenCalledWith('p1');
  });

  it('does not call getDetail when poolId is empty (enabled: false)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = await renderHook(() => usePoolDetailQuery(''), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedPoolsApi.getDetail).not.toHaveBeenCalled();
  });
});

describe('useCreatePoolMutation (invalidates mine, and public only when type is PUBLIC)', () => {
  it('invalidates my-pools on any successful create', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.createPool.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1', type: 'PRIVATE' }) });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ query: useMyPoolsQuery(), mutation: useCreatePoolMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual([]));
    result.current.mutation.mutate({ name: 'Test Pool', type: 'PRIVATE', capacity: 10 });

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
  });

  it('additionally invalidates public pools when the created pool is PUBLIC', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.listPublic.mockResolvedValue([]);
    mockedPoolsApi.createPool.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1', type: 'PUBLIC', inviteToken: 'AB3XK9M2' }) });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({
        mine: useMyPoolsQuery(),
        pub: usePublicPoolsQuery(),
        mutation: useCreatePoolMutation(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    await waitFor(() => expect(result.current.pub.data).toEqual([]));

    result.current.mutation.mutate({ name: 'Test Pool', type: 'PUBLIC', capacity: 10 });

    await waitFor(() => expect(mockedPoolsApi.listPublic).toHaveBeenCalledTimes(2));
  });

  it('does not invalidate anything on a failed create', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.createPool.mockResolvedValue({ ok: false, error: 'NAME_TAKEN' });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ query: useMyPoolsQuery(), mutation: useCreatePoolMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual([]));
    result.current.mutation.mutate({ name: 'Test Pool', type: 'PUBLIC', capacity: 10 });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(1);
  });
});

describe('mutation → invalidation contracts (mirrors use-predictions-query.test.tsx shape)', () => {
  it('useRenamePoolMutation invalidates mine + detail(poolId) on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1' }), members: [], viewerMembership: null });
    mockedPoolsApi.renamePool.mockResolvedValue({ ok: true, name: 'New Name' });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({
        mine: useMyPoolsQuery(),
        detail: usePoolDetailQuery('p1'),
        mutation: useRenamePoolMutation(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    await waitFor(() => expect(result.current.detail.data).toBeDefined());

    result.current.mutation.mutate({ poolId: 'p1', name: 'New Name' });

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedPoolsApi.getDetail).toHaveBeenCalledTimes(2));
  });

  it('useDeletePoolMutation invalidates mine + public on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.listPublic.mockResolvedValue([]);
    mockedPoolsApi.deletePool.mockResolvedValue({ ok: true });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), pub: usePublicPoolsQuery(), mutation: useDeletePoolMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    await waitFor(() => expect(result.current.pub.data).toEqual([]));

    result.current.mutation.mutate('p1');

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedPoolsApi.listPublic).toHaveBeenCalledTimes(2));
  });

  it('useUpdateVisibilityMutation invalidates mine + public + detail on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.listPublic.mockResolvedValue([]);
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1' }), members: [], viewerMembership: null });
    mockedPoolsApi.updateVisibility.mockResolvedValue({ ok: true, type: 'PUBLIC' });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({
        mine: useMyPoolsQuery(),
        pub: usePublicPoolsQuery(),
        detail: usePoolDetailQuery('p1'),
        mutation: useUpdateVisibilityMutation(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    await waitFor(() => expect(result.current.pub.data).toEqual([]));
    await waitFor(() => expect(result.current.detail.data).toBeDefined());

    result.current.mutation.mutate({ poolId: 'p1', type: 'PUBLIC' });

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedPoolsApi.listPublic).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedPoolsApi.getDetail).toHaveBeenCalledTimes(2));
  });

  it('useUpdateMembersCanInviteMutation invalidates only detail(poolId) on success', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1' }), members: [], viewerMembership: null });
    mockedPoolsApi.updateMembersCanInvite.mockResolvedValue({ ok: true, membersCanInvite: false });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ detail: usePoolDetailQuery('p1'), mutation: useUpdateMembersCanInviteMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.data).toBeDefined());
    result.current.mutation.mutate({ poolId: 'p1', membersCanInvite: false });

    await waitFor(() => expect(mockedPoolsApi.getDetail).toHaveBeenCalledTimes(2));
  });

  it('useJoinByTokenMutation invalidates mine on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.joinByToken.mockResolvedValue({ ok: true, poolId: 'p1', alreadyMember: false });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), mutation: useJoinByTokenMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    result.current.mutation.mutate('AB3XK9M2');

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
  });

  it('useJoinByTokenMutation does NOT invalidate on a FULL rejection', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.joinByToken.mockResolvedValue({ ok: false, error: 'FULL' });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), mutation: useJoinByTokenMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    result.current.mutation.mutate('AB3XK9M2');

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(1);
  });

  it('useJoinPublicMutation invalidates mine on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.joinPublic.mockResolvedValue({ ok: true, poolId: 'p1', alreadyMember: false });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), mutation: useJoinPublicMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    result.current.mutation.mutate('p1');

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
  });

  it('useLeavePoolMutation invalidates mine + detail(poolId) on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1' }), members: [], viewerMembership: null });
    mockedPoolsApi.leavePool.mockResolvedValue({ ok: true });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), detail: usePoolDetailQuery('p1'), mutation: useLeavePoolMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    await waitFor(() => expect(result.current.detail.data).toBeDefined());

    result.current.mutation.mutate('p1');

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedPoolsApi.getDetail).toHaveBeenCalledTimes(2));
  });

  it('useLeavePoolMutation does NOT invalidate on OWNER_CANNOT_LEAVE', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.leavePool.mockResolvedValue({ ok: false, error: 'OWNER_CANNOT_LEAVE' });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), mutation: useLeavePoolMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    result.current.mutation.mutate('p1');

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(1);
  });

  it('useKickMemberMutation invalidates detail(poolId) on success', async () => {
    mockedPoolsApi.getDetail.mockResolvedValue({ ok: true, pool: makePool({ id: 'p1' }), members: [], viewerMembership: null });
    mockedPoolsApi.kickMember.mockResolvedValue({ ok: true });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ detail: usePoolDetailQuery('p1'), mutation: useKickMemberMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.detail.data).toBeDefined());
    result.current.mutation.mutate({ poolId: 'p1', targetUserId: 'member-1' });

    await waitFor(() => expect(mockedPoolsApi.getDetail).toHaveBeenCalledTimes(2));
  });

  it('useSetArchivedMutation invalidates mine on success', async () => {
    mockedPoolsApi.getMine.mockResolvedValue([]);
    mockedPoolsApi.setArchived.mockResolvedValue({ ok: true, archived: true });
    const { Wrapper } = createWrapper();

    const { result } = await renderHook(
      () => ({ mine: useMyPoolsQuery(), mutation: useSetArchivedMutation() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.mine.data).toEqual([]));
    result.current.mutation.mutate({ poolId: 'p1', archived: true });

    await waitFor(() => expect(mockedPoolsApi.getMine).toHaveBeenCalledTimes(2));
  });
});
