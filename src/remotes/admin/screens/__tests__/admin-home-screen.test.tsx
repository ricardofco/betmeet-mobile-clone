import { screen, userEvent } from '@testing-library/react-native';
import { AdminHomeScreen } from '@/remotes/admin/screens/admin-home-screen';
import { adminApi } from '@/platform/backend-api/admin-api';
import { renderWithQueryClient } from '@/remotes/admin/test-utils/render-with-query-client';

jest.mock('@/platform/backend-api/admin-api');
const mockedAdminApi = adminApi as jest.Mocked<typeof adminApi>;

function buildProps(navigate = jest.fn()) {
  return {
    navigation: { navigate } as unknown,
    route: {} as unknown,
  } as Parameters<typeof AdminHomeScreen>[0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AdminHomeScreen (ADMIN-1, design.md §5.1/§14 — the remote\'s own independent re-check)', () => {
  it('shows a loading state while the access check is in flight', async () => {
    mockedAdminApi.checkAccess.mockReturnValue(new Promise(() => {}));

    await renderWithQueryClient(<AdminHomeScreen {...buildProps()} />);

    expect(screen.getByText('Checking access…')).toBeOnTheScreen();
  });

  it('shows an access-denied state and no dashboard buttons when isAdmin is false', async () => {
    mockedAdminApi.checkAccess.mockResolvedValue({ isAdmin: false });

    await renderWithQueryClient(<AdminHomeScreen {...buildProps()} />);

    expect(await screen.findByText("You don't have access to this section.")).toBeOnTheScreen();
    expect(screen.queryByText('Rescoring sweep')).not.toBeOnTheScreen();
    expect(screen.queryByText('Force match result')).not.toBeOnTheScreen();
    expect(screen.queryByText('Revert override')).not.toBeOnTheScreen();
  });

  it('shows the three dashboard buttons when isAdmin is true', async () => {
    mockedAdminApi.checkAccess.mockResolvedValue({ isAdmin: true });

    await renderWithQueryClient(<AdminHomeScreen {...buildProps()} />);

    expect(await screen.findByText('Rescoring sweep')).toBeOnTheScreen();
    expect(screen.getByText('Force match result')).toBeOnTheScreen();
    expect(screen.getByText('Revert override')).toBeOnTheScreen();
  });

  it('navigates to SweepStatus/ForceResult/RevertOverride when each button is pressed', async () => {
    mockedAdminApi.checkAccess.mockResolvedValue({ isAdmin: true });
    const navigate = jest.fn();
    const user = userEvent.setup();

    await renderWithQueryClient(<AdminHomeScreen {...buildProps(navigate)} />);
    await screen.findByText('Rescoring sweep');

    await user.press(screen.getByText('Rescoring sweep'));
    expect(navigate).toHaveBeenCalledWith('SweepStatus');

    await user.press(screen.getByText('Force match result'));
    expect(navigate).toHaveBeenCalledWith('ForceResult');

    await user.press(screen.getByText('Revert override'));
    expect(navigate).toHaveBeenCalledWith('RevertOverride');
  });
});
