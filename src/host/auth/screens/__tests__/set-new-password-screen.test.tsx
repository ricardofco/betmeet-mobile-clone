import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { SetNewPasswordScreen } from '@/host/auth/screens/set-new-password-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockAdapter = {
  setNewPassword: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
});

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof SetNewPasswordScreen>[0];
}

describe('SetNewPasswordScreen', () => {
  it('renders the new-password input and submit button', async () => {
    await renderWithQueryClient(<SetNewPasswordScreen {...buildProps()} />);
    expect(screen.getByLabelText('New password')).toBeTruthy();
    expect(screen.getByText('Update password')).toBeTruthy();
  });

  it('shows a success message after password is updated', async () => {
    mockAdapter.setNewPassword.mockResolvedValue({ type: 'password-updated' });
    const user = userEvent.setup();
    await renderWithQueryClient(<SetNewPasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('New password'), 'newSecurePass123');
    await user.press(screen.getByText('Update password'));

    expect(await screen.findByText('Password updated')).toBeTruthy();
    expect(mockAdapter.setNewPassword).toHaveBeenCalledWith('newSecurePass123');
  });

  it('shows a validation error for a weak password', async () => {
    mockAdapter.setNewPassword.mockResolvedValue({
      type: 'validation-error',
      reason: 'Password must be at least 8 characters.',
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<SetNewPasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('New password'), 'short');
    await user.press(screen.getByText('Update password'));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy();
  });

  it('shows a generic error on adapter error', async () => {
    mockAdapter.setNewPassword.mockResolvedValue({ type: 'error' });
    const user = userEvent.setup();
    await renderWithQueryClient(<SetNewPasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('New password'), 'validpassword');
    await user.press(screen.getByText('Update password'));

    expect(await screen.findByText(/Something went wrong/)).toBeTruthy();
  });
});
