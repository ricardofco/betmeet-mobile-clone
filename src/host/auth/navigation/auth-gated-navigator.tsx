import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { evaluateGuard, type Destination } from '@/domain/auth/auth-guard';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { useAuthSessionStore } from '@/host/auth/auth-session-store';
import { screenClassFor } from '@/host/auth/navigation/screen-registry';
import type {
  AuthStackParamList,
  MfaStackParamList,
  OnboardingStackParamList,
} from '@/host/auth/navigation/auth-stack-params';
import { SignInScreen } from '@/host/auth/screens/sign-in-screen';
import { SignUpScreen } from '@/host/auth/screens/sign-up-screen';
import { ForgotPasswordScreen } from '@/host/auth/screens/forgot-password-screen';
import { SetNewPasswordScreen } from '@/host/auth/screens/set-new-password-screen';
import { VerifyEmailScreen } from '@/host/auth/screens/verify-email-screen';
import { MfaChallengeScreen } from '@/host/auth/screens/mfa-challenge-screen';
import { OnboardingWizardProvider } from '@/host/profile/screens/onboarding-wizard-screen';
import { OnboardingNicknameScreen } from '@/host/profile/screens/onboarding-nickname-screen';
import { OnboardingAvatarScreen } from '@/host/profile/screens/onboarding-avatar-screen';
import { OnboardingRulesScreen } from '@/host/profile/screens/onboarding-rules-screen';
import { OnboardingNotificationsScreen } from '@/host/profile/screens/onboarding-notifications-screen';
import { OnboardingSecondFactorScreen } from '@/host/profile/screens/onboarding-second-factor-screen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MfaStack = createNativeStackNavigator<MfaStackParamList>();
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
 * Bolt 2 extension (ADR-008): new `mfa-challenge` branch, inserted between
 * the verify-email redirect and the onboarding/home check.
 */
export function AuthGatedNavigator({ renderAppTree }: AuthGatedNavigatorProps) {
  const status = useAuthSessionStore(state => state.status);
  const claims = useAuthSessionStore(state => state.claims);
  const setSession = useAuthSessionStore(state => state.setSession);
  const setPendingDestination = useAuthSessionStore(state => state.setPendingDestination);
  const hasEjectedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = getSupabaseAdapter().onSessionChange( (x)=> {
      console.log('xxxxxonSessionChange', x)
      setSession(x)
    });
    return unsubscribe;
  }, [setSession]);

  console.log("status", status)

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  const intendedDestination: Destination = { screenClass: screenClassFor('Home'), route: 'Home' };
  const outcome = evaluateGuard(claims, intendedDestination.screenClass, intendedDestination);

  switch (outcome.type) {
    case 'eject': {
      if (!hasEjectedRef.current) {
        hasEjectedRef.current = true;
        getSupabaseAdapter()
          .signOut()
          .catch(() => {
            // Best-effort: the keychain-backed session storage is cleared
            // client-side by the SDK regardless.
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
      if (outcome.to === 'mfa-challenge') {
        return <MfaChallengeTree />;
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
      <AuthStack.Screen
        name="SetNewPassword"
        component={SetNewPasswordScreen}
        options={{ title: 'Set new password' }}
      />
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
      <AuthStack.Screen
        name="SetNewPassword"
        component={SetNewPasswordScreen}
        options={{ title: 'Set new password' }}
      />
    </AuthStack.Navigator>
  );
}

/**
 * MFA challenge tree (ADR-008). Single-screen navigator; no back button.
 * The user exits by: successful MFA verification (guard re-renders to app
 * tree) or signing out (guard re-renders to unauthenticated tree).
 */
function MfaChallengeTree() {
  return (
    <MfaStack.Navigator screenOptions={{ headerShown: false }}>
      <MfaStack.Screen name="MfaChallenge" component={MfaChallengeScreen} />
    </MfaStack.Navigator>
  );
}

/**
 * Bolt 3 (design.md §5.1): replaces the Bolt-1 single-screen placeholder
 * with the real 5-step wizard, wrapped in `OnboardingWizardProvider` so
 * every step screen shares one `OnboardingWizardState` instance for the
 * duration of the wizard session (never persisted — model.md §2.7).
 */
function OnboardingTree() {
  return (
    <OnboardingWizardProvider>
      <OnboardingStack.Navigator>
        <OnboardingStack.Screen
          name="OnboardingNickname"
          component={OnboardingNicknameScreen}
          options={{ title: 'Nickname' }}
        />
        <OnboardingStack.Screen
          name="OnboardingAvatar"
          component={OnboardingAvatarScreen}
          options={{ title: 'Avatar' }}
        />
        <OnboardingStack.Screen
          name="OnboardingRules"
          component={OnboardingRulesScreen}
          options={{ title: 'Rules' }}
        />
        <OnboardingStack.Screen
          name="OnboardingNotifications"
          component={OnboardingNotificationsScreen}
          options={{ title: 'Notifications' }}
        />
        <OnboardingStack.Screen
          name="OnboardingSecondFactor"
          component={OnboardingSecondFactorScreen}
          options={{ title: 'Security' }}
        />
      </OnboardingStack.Navigator>
    </OnboardingWizardProvider>
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
