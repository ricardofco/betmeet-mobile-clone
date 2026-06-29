import { render, screen, userEvent } from '@testing-library/react-native';
import { UnconfirmedEmailPanel } from '@/host/auth/screens/unconfirmed-email-panel';
import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';

jest.mock('@/platform/backend-api/backend-api-client');

describe('UnconfirmedEmailPanel', () => {
  const mockedClient = getBackendApiClient as jest.MockedFunction<typeof getBackendApiClient>;

  beforeEach(() => {
    mockedClient.mockReset();
    jest.useRealTimers();
  });

  it('renders the email and a resend button', async () => {
    mockedClient.mockReturnValue({
      resendConfirmation: jest.fn().mockResolvedValue({ throttled: false }),
    } as unknown as ReturnType<typeof getBackendApiClient>);

    await render(<UnconfirmedEmailPanel email="user@example.com" />);

    expect(screen.getByText('user@example.com')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resend confirmation' })).toBeOnTheScreen();
  });

  it('shows a sent confirmation on a successful resend (AUTH-1 AC: not a silent failure either way)', async () => {
    mockedClient.mockReturnValue({
      resendConfirmation: jest.fn().mockResolvedValue({ throttled: false }),
    } as unknown as ReturnType<typeof getBackendApiClient>);

    const user = userEvent.setup();
    await render(<UnconfirmedEmailPanel email="user@example.com" />);

    await user.press(screen.getByRole('button', { name: 'Resend confirmation' }));

    expect(await screen.findByText('Confirmation email sent.')).toBeOnTheScreen();
  });

  it('shows the remaining-seconds countdown on a throttled resend, not a silent failure (AUTH-1 AC)', async () => {
    mockedClient.mockReturnValue({
      resendConfirmation: jest.fn().mockResolvedValue({ throttled: true, remainingSeconds: 42 }),
    } as unknown as ReturnType<typeof getBackendApiClient>);

    const user = userEvent.setup();
    await render(<UnconfirmedEmailPanel email="user@example.com" />);

    await user.press(screen.getByRole('button', { name: 'Resend confirmation' }));

    expect(await screen.findByText('Please wait before requesting another email.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Resend in 42s' })).toBeOnTheScreen();
  });

  it('disables the resend button while throttled, preventing a second silent tap', async () => {
    mockedClient.mockReturnValue({
      resendConfirmation: jest.fn().mockResolvedValue({ throttled: true, remainingSeconds: 10 }),
    } as unknown as ReturnType<typeof getBackendApiClient>);

    const user = userEvent.setup();
    await render(<UnconfirmedEmailPanel email="user@example.com" />);

    await user.press(screen.getByRole('button', { name: 'Resend confirmation' }));

    const button = await screen.findByRole('button', { name: 'Resend in 10s' });
    expect(button).toBeDisabled();
  });
});
