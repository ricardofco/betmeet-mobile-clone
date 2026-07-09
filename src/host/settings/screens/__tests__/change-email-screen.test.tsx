import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { ChangeEmailScreen } from '@/host/settings/screens/change-email-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockAdapter = {
  changeEmail: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
});

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof ChangeEmailScreen>[0];
}

describe('ChangeEmailScreen', () => {
  it('renders the new email input and submit button', async () => {
    await renderWithQueryClient(<ChangeEmailScreen {...buildProps()} />);
    expect(screen.getByLabelText('New email')).toBeTruthy();
    expect(screen.getByText('Send confirmation')).toBeTruthy();
  });

  it('shows a confirmation-sent message with the new email address', async () => {
    mockAdapter.changeEmail.mockResolvedValue({ type: 'confirmation-sent' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ChangeEmailScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('New email'), 'new@example.com');
    await user.press(screen.getByText('Send confirmation'));

    expect(await screen.findByText(/Check your new email/)).toBeTruthy();
    expect(screen.getByText(/new@example.com/)).toBeTruthy();
    expect(mockAdapter.changeEmail).toHaveBeenCalledWith('new@example.com');
  });

  it('shows an invalid-email error for a malformed email', async () => {
    mockAdapter.changeEmail.mockResolvedValue({
      type: 'invalid-email',
      reason: 'Enter a valid email address.',
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<ChangeEmailScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('New email'), 'not-an-email');
    await user.press(screen.getByText('Send confirmation'));

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
  });

  it('shows a generic error on adapter error', async () => {
    mockAdapter.changeEmail.mockResolvedValue({ type: 'error' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ChangeEmailScreen {...buildProps()} />);

    await user.type(screen.getByLabelText('New email'), 'user@example.com');
    await user.press(screen.getByText('Send confirmation'));

    expect(await screen.findByText(/Unable to change email/)).toBeTruthy();
  });
});
