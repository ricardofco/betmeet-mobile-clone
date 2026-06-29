import { render, screen } from '@testing-library/react-native';
import { VerifyEmailScreen } from '@/host/auth/screens/verify-email-screen';
import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';

jest.mock('@/platform/backend-api/backend-api-client');

/**
 * ADR-004: one merged screen, reachable from two distinct triggers/`reason`
 * values, branching only on copy — same `UnconfirmedEmailPanel` either way.
 */
describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    (getBackendApiClient as jest.MockedFunction<typeof getBackendApiClient>).mockReturnValue({
      resendConfirmation: jest.fn().mockResolvedValue({ throttled: false }),
    } as unknown as ReturnType<typeof getBackendApiClient>);
  });

  it('shows post-signup copy for reason="post-signup"', async () => {
    await render(<VerifyEmailScreen email="new-user@example.com" reason="post-signup" />);
    expect(screen.getByText('Check your email to finish signing up')).toBeOnTheScreen();
    expect(screen.getByText('new-user@example.com')).toBeOnTheScreen();
  });

  it('shows unconfirmed-session copy for reason="unconfirmed-session" (AUTH-7 rule 3 destination)', async () => {
    await render(<VerifyEmailScreen email="returning-user@example.com" reason="unconfirmed-session" />);
    expect(screen.getByText('Please verify your email to continue')).toBeOnTheScreen();
    expect(screen.getByText('returning-user@example.com')).toBeOnTheScreen();
  });

  it('renders the same resend affordance regardless of reason', async () => {
    await render(<VerifyEmailScreen email="user@example.com" reason="post-signup" />);
    expect(screen.getByRole('button', { name: 'Resend confirmation' })).toBeOnTheScreen();
  });
});
