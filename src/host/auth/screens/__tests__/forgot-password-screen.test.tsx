import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { ForgotPasswordScreen } from '@/host/auth/screens/forgot-password-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockAdapter = {
  requestPasswordReset: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
});

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof ForgotPasswordScreen>[0];
}

describe('ForgotPasswordScreen', () => {
  it('renders the email input and submit button', async () => {
    await renderWithQueryClient(<ForgotPasswordScreen {...buildProps()} />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByText('Send reset link')).toBeTruthy();
  });

  it('shows a confirmation message after successful submission', async () => {
    mockAdapter.requestPasswordReset.mockResolvedValue({ type: 'sent' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ForgotPasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.press(screen.getByText('Send reset link'));

    expect(await screen.findByText('Check your inbox')).toBeTruthy();
    expect(mockAdapter.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
  });

  it('shows an invalid-email error for a bad email', async () => {
    mockAdapter.requestPasswordReset.mockResolvedValue({ type: 'invalid-email' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ForgotPasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.press(screen.getByText('Send reset link'));

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
  });

  it('shows a generic error for adapter error result', async () => {
    mockAdapter.requestPasswordReset.mockResolvedValue({ type: 'error' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ForgotPasswordScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.press(screen.getByText('Send reset link'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
  });
});
