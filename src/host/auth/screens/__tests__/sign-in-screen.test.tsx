import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { SignInScreen } from '@/host/auth/screens/sign-in-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

jest.mock('@/platform/supabase/supabase-adapter');

const Stack = createNativeStackNavigator<AuthStackParamList>();

function NullScreen() {
  return null;
}

// Change-2026-07-08 (i18n completion): `SignInScreen` now calls
// `useTranslation()` — reuses the host's existing `renderWithQueryClient`
// test helper (already relied on by several host test suites outside
// `profile/`, e.g. `account-settings-screen.test.tsx`) purely for its
// `I18nextProvider`/`TamaguiProvider` wrapping, forcing English so this
// suite's existing literal-string assertions keep passing unmodified.
function renderSignInScreen() {
  return renderWithQueryClient(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={NullScreen} />
        <Stack.Screen name="ForgotPassword" component={NullScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('SignInScreen', () => {
  const mockedSignIn = getSupabaseAdapter as jest.MockedFunction<typeof getSupabaseAdapter>;

  beforeEach(() => {
    mockedSignIn.mockReset();
  });

  it('shows a distinct unconfirmed-email panel — not a generic credential error — when sign-in returns unconfirmed-email (AUTH-1 AC)', async () => {
    mockedSignIn.mockReturnValue({
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ type: 'unconfirmed-email', email: 'pending@example.com' }),
    } as unknown as ReturnType<typeof getSupabaseAdapter>);

    const user = userEvent.setup();
    await renderSignInScreen();

    await user.type(screen.getByLabelText('Email'), 'pending@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('pending@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Resend confirmation')).toBeOnTheScreen();
    expect(screen.queryByText('Incorrect email or password.')).not.toBeOnTheScreen();
  });

  it('shows one generic error — no account-enumeration signal — for invalid credentials (AUTH-1 AC)', async () => {
    mockedSignIn.mockReturnValue({
      signInWithPassword: jest.fn().mockResolvedValue({ type: 'invalid-credentials' }),
    } as unknown as ReturnType<typeof getSupabaseAdapter>);

    const user = userEvent.setup();
    await renderSignInScreen();

    await user.type(screen.getByLabelText('Email'), 'nobody@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeOnTheScreen();
    expect(screen.queryByText('Resend confirmation')).not.toBeOnTheScreen();
  });

  it('does not render any error/panel state while signed-in (the guard, not this screen, decides where to go next)', async () => {
    mockedSignIn.mockReturnValue({
      signInWithPassword: jest.fn().mockResolvedValue({ type: 'signed-in' }),
    } as unknown as ReturnType<typeof getSupabaseAdapter>);

    const user = userEvent.setup();
    await renderSignInScreen();

    await user.type(screen.getByLabelText('Email'), 'real-user@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.queryByText('Incorrect email or password.')).not.toBeOnTheScreen();
    expect(screen.queryByText('Resend confirmation')).not.toBeOnTheScreen();
  });
});
