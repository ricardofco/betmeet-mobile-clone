import { render, screen, userEvent } from '@testing-library/react-native';
import { MfaChallengeScreen } from '@/host/auth/screens/mfa-challenge-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { useAuthSessionStore } from '@/host/auth/auth-session-store';
import { UNAUTHENTICATED_CLAIMS } from '@/domain/auth/auth-claims';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

const mockAdapter = {
  getMfaFactors: jest.fn(),
  challengeAndVerifyMfa: jest.fn(),
  signOut: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
  // Seed the store with a known factor ID so tests don't have to wait for getMfaFactors
  useAuthSessionStore.setState({
    status: 'ready',
    claims: UNAUTHENTICATED_CLAIMS,
    pendingDestination: null,
    mfaFactorId: 'factor-abc-123',
  });
});

describe('MfaChallengeScreen', () => {
  it('renders the code input and verify button when a factor ID is known', async () => {
    await render(<MfaChallengeScreen />);
    expect(screen.getByLabelText('Authentication code')).toBeTruthy();
    expect(screen.getByText('Verify')).toBeTruthy();
  });

  it('shows invalid-code error when verification fails with invalid-code', async () => {
    mockAdapter.challengeAndVerifyMfa.mockResolvedValue({ type: 'invalid-code' });
    const user = userEvent.setup();
    await render(<MfaChallengeScreen />);

    await user.type(screen.getByLabelText('Authentication code'), '123456');
    await user.press(screen.getByText('Verify'));

    expect(await screen.findByText(/Incorrect code/)).toBeTruthy();
    expect(mockAdapter.challengeAndVerifyMfa).toHaveBeenCalledWith('factor-abc-123', '123456');
  });

  it('shows expired error when challenge has expired', async () => {
    mockAdapter.challengeAndVerifyMfa.mockResolvedValue({ type: 'expired' });
    const user = userEvent.setup();
    await render(<MfaChallengeScreen />);

    await user.type(screen.getByLabelText('Authentication code'), '999888');
    await user.press(screen.getByText('Verify'));

    expect(await screen.findByText(/Code expired/)).toBeTruthy();
  });

  it('shows generic error on adapter error', async () => {
    mockAdapter.challengeAndVerifyMfa.mockResolvedValue({ type: 'error' });
    const user = userEvent.setup();
    await render(<MfaChallengeScreen />);

    await user.type(screen.getByLabelText('Authentication code'), '111222');
    await user.press(screen.getByText('Verify'));

    expect(await screen.findByText(/Something went wrong/)).toBeTruthy();
  });

  it('calls getMfaFactors on mount when no factor ID is in the store', async () => {
    mockAdapter.getMfaFactors.mockResolvedValue({ factorId: 'factor-from-api' });
    useAuthSessionStore.setState({ mfaFactorId: null });

    await render(<MfaChallengeScreen />);

    // Wait for the loading state to resolve and inputs to appear
    expect(await screen.findByLabelText('Authentication code')).toBeTruthy();
    expect(mockAdapter.getMfaFactors).toHaveBeenCalled();
  });

  it('renders a sign-out link', async () => {
    await render(<MfaChallengeScreen />);
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('calls signOut when the sign-out link is pressed', async () => {
    mockAdapter.signOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<MfaChallengeScreen />);

    await user.press(screen.getByText('Sign out'));
    expect(mockAdapter.signOut).toHaveBeenCalled();
  });
});
