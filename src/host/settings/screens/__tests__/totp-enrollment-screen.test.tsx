import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { TotpEnrollmentScreen } from '@/host/settings/screens/totp-enrollment-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

jest.mock('@/platform/supabase/supabase-adapter', () => ({
  getSupabaseAdapter: jest.fn(),
}));

// react-native-qrcode-svg is mocked via __mocks__/react-native-qrcode-svg.js
// It renders as a View with testID="qr-code".

const mockAdapter = {
  enrollTotp: jest.fn(),
  verifyTotpEnrollment: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseAdapter as jest.Mock).mockReturnValue(mockAdapter);
});

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as unknown,
    route: {} as unknown,
  } as Parameters<typeof TotpEnrollmentScreen>[0];
}

describe('TotpEnrollmentScreen', () => {
  it('renders the initial idle state with "Get started" button', async () => {
    await renderWithQueryClient(<TotpEnrollmentScreen {...buildProps()} />);
    expect(screen.getByText('Enable two-factor authentication')).toBeTruthy();
    expect(screen.getByText('Get started')).toBeTruthy();
  });

  it('transitions to pending-scan and renders QR code after "Get started" is pressed', async () => {
    mockAdapter.enrollTotp.mockResolvedValue({
      totpSecret: 'JBSWY3DPEHPK3PXP',
      qrCodeUri: 'otpauth://totp/BetmeetMobile:user@example.com?secret=JBSWY3DPEHPK3PXP',
      factorId: 'factor-123',
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<TotpEnrollmentScreen {...buildProps()} />);

    await user.press(screen.getByText('Get started'));

    // QR code mock renders as View with testID="qr-code"
    expect(await screen.findByTestId('qr-code')).toBeTruthy();
    expect(mockAdapter.enrollTotp).toHaveBeenCalled();
  });

  it('shows the manual secret key in pending-scan phase', async () => {
    mockAdapter.enrollTotp.mockResolvedValue({
      totpSecret: 'JBSWY3DPEHPK3PXP',
      qrCodeUri: 'otpauth://totp/test',
      factorId: 'factor-123',
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<TotpEnrollmentScreen {...buildProps()} />);

    await user.press(screen.getByText('Get started'));
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
  });

  it('shows "verified" confirmation after successful verification', async () => {
    mockAdapter.enrollTotp.mockResolvedValue({
      totpSecret: 'SECRET',
      qrCodeUri: 'otpauth://totp/test',
      factorId: 'factor-123',
    });
    mockAdapter.verifyTotpEnrollment.mockResolvedValue({ type: 'verified' });
    const user = userEvent.setup();
    await renderWithQueryClient(<TotpEnrollmentScreen {...buildProps()} />);

    await user.press(screen.getByText('Get started'));

    const input = await screen.findByLabelText('Authentication code');
    await user.type(input, '123456');
    await user.press(screen.getByText('Verify and enable'));

    expect(await screen.findByText('Two-factor authentication enabled')).toBeTruthy();
    expect(mockAdapter.verifyTotpEnrollment).toHaveBeenCalledWith('factor-123', '123456');
  });

  it('shows invalid-code error and stays on pending-scan for wrong code', async () => {
    mockAdapter.enrollTotp.mockResolvedValue({
      totpSecret: 'SECRET',
      qrCodeUri: 'otpauth://totp/test',
      factorId: 'factor-123',
    });
    mockAdapter.verifyTotpEnrollment.mockResolvedValue({ type: 'invalid-code' });
    const user = userEvent.setup();
    await renderWithQueryClient(<TotpEnrollmentScreen {...buildProps()} />);

    await user.press(screen.getByText('Get started'));

    const input = await screen.findByLabelText('Authentication code');
    await user.type(input, '000000');
    await user.press(screen.getByText('Verify and enable'));

    expect(await screen.findByText(/Incorrect code/)).toBeTruthy();
    // QR code still visible (pending-scan retained)
    expect(screen.getByTestId('qr-code')).toBeTruthy();
  });

  it('shows error phase when enrollTotp throws', async () => {
    mockAdapter.enrollTotp.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    await renderWithQueryClient(<TotpEnrollmentScreen {...buildProps()} />);

    await user.press(screen.getByText('Get started'));

    expect(await screen.findByText('Enrollment failed')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });
});
