import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { evaluateGuard, type Destination } from '@/domain/auth/auth-guard';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { useAuthSessionStore } from '@/host/auth/auth-session-store';
import { screenClassFor } from '@/host/auth/navigation/screen-registry';
import type { AuthStackParamList, OnboardingStackParamList } from '@/host/auth/navigation/auth-stack-params';
import { SignInScreen } from '@/host/auth/screens/sign-in-screen';
import { SignUpScreen } from '@/host/auth/screens/sign-up-screen';
import { ForgotPasswordScreen } from '@/host/auth/screens/forgot-password-screen';
import { ResetPasswordScreen } from '@/host/auth/screens/reset-password-screen';
import { VerifyEmailScreen } from '@/host/auth/screens/verify-email-screen';
import { OnboardingScreen } from '@/host/auth/screens/onboarding-screen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

type AuthGatedNavigatorProps = {
  /** The protected screen tree, rendered once the guard says "proceed" (rule 6). */
  renderAppTree: () => React.ReactElement;
};

/**
 * AUTH-7's guard, wired to React Navigation via conditional screen-tree
 * rendering (ADR-001) — not action interception. Renders exactly one branch
 * per render: an unreachable screen is never registered into the tree to
 * begin with, so there is no "wrong screen" to flash-then-correct.
 *
 * On cold launch (`status === 'loading'`, no `onSessionChange` emission
 * received yet), renders a splash view — not a `ScreenClass`-routed
 * decision, just "we don't know yet" (model.md §3).
 */
export function AuthGatedNavigator({ renderAppTree }: AuthGatedNavigatorProps) {
  const status = useAuthSessionStore(state => state.status);
  const claims = useAuthSessionStore(state => state.claims);
  const setSession = useAuthSessionStore(state => state.setSession);
  const setPendingDestination = useAuthSessionStore(state => state.setPendingDestination);
  const hasEjectedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = getSupabaseAdapter().onSessionChange(setSession);
    return unsubscribe;
  }, [setSession]);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  // The entry screen on cold launch / whenever no specific destination was
  // requested defaults to Home — every later unit can extend this once more
  // protected routes exist.
  const intendedDestination: Destination = { screenClass: screenClassFor('Home'), route: 'Home' };
  const outcome = evaluateGuard(claims, intendedDestination.screenClass, intendedDestination);

  switch (outcome.type) {
    case 'eject': {
      // One-shot side effect: fire sign-out, then fall through to the
      // unauthenticated tree on the next render once the session clears.
      if (!hasEjectedRef.current) {
        hasEjectedRef.current = true;
        getSupabaseAdapter()
          .signOut()
          .catch(() => {
            // Best-effort: even if sign-out's network call fails, the
            // keychain-backed session storage is cleared client-side by the
            // SDK regardless (AUTH-8) — the ejected user falls through to
            // UnauthenticatedTree on the next render either way.
          });
      }
      return (
        <View style={styles.splash}>
          <ActivityIndicator />
        </View>
      );
    }

    case 'redirect': {
      hasEjectedRef.current = false;
      if (outcome.to === 'sign-in') {
        setPendingDestination(outcome.rememberDestination);
        return <UnauthenticatedTree />;
      }
      if (outcome.to === 'verify-email') {
        return <VerifyEmailTree />;
      }
      if (outcome.to === 'onboarding') {
        setPendingDestination(outcome.rememberDestination);
        return <OnboardingTree />;
      }
      // outcome.to === 'home'
      return renderAppTree();
    }

    case 'proceed':
    default:
      hasEjectedRef.current = false;
      return renderAppTree();
  }
}

function UnauthenticatedTree() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot password' }}
      />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset password' }} />
      <AuthStack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreenRoute}
        options={{ title: 'Verify email' }}
      />
    </AuthStack.Navigator>
  );
}

function VerifyEmailTree() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreenRoute} options={{ title: 'Verify email' }} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot password' }}
      />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset password' }} />
    </AuthStack.Navigator>
  );
}

function OnboardingTree() {
  return (
    <OnboardingStack.Navigator>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Onboarding' }} />
    </OnboardingStack.Navigator>
  );
}

function VerifyEmailScreenRoute({
  route,
}: {
  route: { params?: { email?: string; reason?: 'post-signup' | 'unconfirmed-session' } };
}) {
  const email = route.params?.email ?? '';
  const reason = route.params?.reason ?? 'unconfirmed-session';
  return <VerifyEmailScreen email={email} reason={reason} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
