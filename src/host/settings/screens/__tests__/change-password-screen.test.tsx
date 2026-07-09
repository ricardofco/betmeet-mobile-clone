import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { ChangePasswordScreen } from '@/host/settings/screens/change-password-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockAdapter = {
  changePassword: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
});

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof ChangePasswordScreen>[0];
}

describe('ChangePasswordScreen', () => {
  it('renders current password and new password inputs', async () => {
    await renderWithQueryClient(<ChangePasswordScreen {...buildProps()} />);
    expect(screen.getByLabelText('Current password')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toBeTruthy();
  });

  it('shows a success message when password is changed', async () => {
    mockAdapter.changePassword.mockResolvedValue({ type: 'password-changed' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ChangePasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('Current password'), 'OldPass123');
    await user.type(screen.getByLabelText('New password'), 'NewPass456');
    await user.press(screen.getByText('Save new password'));

    expect(await screen.findByText('Password changed')).toBeTruthy();
    expect(mockAdapter.changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass456');
  });

  it('shows a validation error for a weak new password', async () => {
    mockAdapter.changePassword.mockResolvedValue({
      type: 'validation-error',
      reason: 'Password must be at least 8 characters.',
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<ChangePasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('Current password'), 'OldPass123');
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.press(screen.getByText('Save new password'));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy();
  });

  it('shows a generic error on adapter error (hides current-password failure reason)', async () => {
    mockAdapter.changePassword.mockResolvedValue({ type: 'error' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ChangePasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('Current password'), 'WrongOldPass');
    await user.type(screen.getByLabelText('New password'), 'NewPass456');
    await user.press(screen.getByText('Save new password'));

    expect(await screen.findByText(/Unable to change password/)).toBeTruthy();
  });
});
