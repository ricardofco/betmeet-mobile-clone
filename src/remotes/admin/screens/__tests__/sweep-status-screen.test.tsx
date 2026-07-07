import { screen, userEvent } from '@testing-library/react-native';
import { SweepStatusScreen } from '@/remotes/admin/screens/sweep-status-screen';
import { adminApi } from '@/platform/backend-api/admin-api';
import { renderWithQueryClient } from '@/remotes/admin/test-utils/render-with-query-client';

jest.mock('@/platform/backend-api/admin-api');
const mockedAdminApi = adminApi as jest.Mocked<typeof adminApi>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SweepStatusScreen (ADMIN-2/3 merged, design.md §5.2/ADR-058)', () => {
  it('shows a loading state while the query is in flight', async () => {
    mockedAdminApi.getScoringSweepStatus.mockReturnValue(new Promise(() => {}));

    await renderWithQueryClient(<SweepStatusScreen />);

    expect(screen.getByText('Loading sweep status…')).toBeOnTheScreen();
  });

  it('shows an error state when the query fails', async () => {
    mockedAdminApi.getScoringSweepStatus.mockRejectedValue(new Error('network down'));

    await renderWithQueryClient(<SweepStatusScreen />);

    expect(await screen.findByText('Could not load the sweep status.')).toBeOnTheScreen();
  });

  it('shows the "never run" state when the sweep has never run', async () => {
    mockedAdminApi.getScoringSweepStatus.mockResolvedValue({ ok: true, lastRunAt: null, lastSweptCount: null });

    await renderWithQueryClient(<SweepStatusScreen />);

    expect(await screen.findByText('Never run')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
  });

  it('shows the last-run timestamp and swept count when the sweep has run', async () => {
    mockedAdminApi.getScoringSweepStatus.mockResolvedValue({
      ok: true,
      lastRunAt: '2026-07-07T09:00:00.000Z',
      lastSweptCount: 4,
    });

    await renderWithQueryClient(<SweepStatusScreen />);

    expect(await screen.findByText('4')).toBeOnTheScreen();
    expect(screen.queryByText('Never run')).not.toBeOnTheScreen();
  });

  it('triggers the sweep when the button is pressed and refreshes the status', async () => {
    mockedAdminApi.getScoringSweepStatus
      .mockResolvedValueOnce({ ok: true, lastRunAt: null, lastSweptCount: null })
      .mockResolvedValueOnce({ ok: true, lastRunAt: '2026-07-07T09:00:00.000Z', lastSweptCount: 2 });
    mockedAdminApi.triggerScoringSweep.mockResolvedValue({
      ok: true,
      sweptCount: 2,
      ranAt: '2026-07-07T09:00:00.000Z',
    });

    const user = userEvent.setup();
    await renderWithQueryClient(<SweepStatusScreen />);
    await screen.findByText('Never run');

    await user.press(screen.getByText('Re-check for unscored finished matches'));

    expect(mockedAdminApi.triggerScoringSweep).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('2')).toBeOnTheScreen();
  });
});
