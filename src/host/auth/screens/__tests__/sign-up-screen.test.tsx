import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { SignUpScreen } from '@/host/auth/screens/sign-up-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

jest.mock('@/platform/supabase/supabase-adapter');

const Stack = createNativeStackNavigator<AuthStackParamList>();

function NullScreen() {
  return null;
}

function renderSignUpScreen() {
  return renderWithQueryClient(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="SignIn" component={NullScreen} />
        <Stack.Screen name="VerifyEmail" component={NullScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('SignUpScreen', () => {
  const mockedAdapter = getSupabaseAdapter as jest.MockedFunction<typeof getSupabaseAdapter>;

  beforeEach(() => {
    mockedAdapter.mockReset();
  });

  it('shows a client-side validation error for a password under 8 characters, without calling the adapter (AUTH-1 rule)', async () => {
    const signUp = jest.fn();
    mockedAdapter.mockReturnValue({ signUp } as unknown as ReturnType<typeof getSupabaseAdapter>);

    const user = userEvent.setup();
    await renderSignUpScreen();

    await user.type(screen.getByLabelText('Email'), 'new-user@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.press(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeOnTheScreen();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('navigates toward the pending-confirmation outcome on a successful sign-up (AUTH-1 AC: email-verification waiting state)', async () => {
    const signUp = jest.fn().mockResolvedValue({ type: 'pending-confirmation', email: 'new-user@example.com' });
    mockedAdapter.mockReturnValue({ signUp } as unknown as ReturnType<typeof getSupabaseAdapter>);

    const user = userEvent.setup();
    await renderSignUpScreen();

    await user.type(screen.getByLabelText('Email'), 'new-user@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenoughpassword');
    await user.press(screen.getByRole('button', { name: 'Sign up' }));

    expect(signUp).toHaveBeenCalledWith('new-user@example.com', 'longenoughpassword');
  });

  it('shows a generic error message on a generic sign-up failure', async () => {
    const signUp = jest.fn().mockResolvedValue({ type: 'error' });
    mockedAdapter.mockReturnValue({ signUp } as unknown as ReturnType<typeof getSupabaseAdapter>);

    const user = userEvent.setup();
    await renderSignUpScreen();

    await user.type(screen.getByLabelText('Email'), 'new-user@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenoughpassword');
    await user.press(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText(/something went wrong/i)).toBeOnTheScreen();
  });
});
