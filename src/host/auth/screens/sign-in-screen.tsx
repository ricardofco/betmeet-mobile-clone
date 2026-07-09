import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SignInResult } from '@/domain/auth/sign-in';
import type { OAuthSignInResult } from '@/platform/supabase/supabase-adapter';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { UnconfirmedEmailPanel } from '@/host/auth/screens/unconfirmed-email-panel';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

/**
 * AUTH-1's sign-in form + AUTH-2's Google OAuth button (Bolt 2).
 *
 * `unconfirmed-email` renders `UnconfirmedEmailPanel` inline (AC: not a
 * generic credential error); `invalid-credentials` shows one generic message
 * (anti-enumeration). `signed-in` does nothing itself — `AuthGatedNavigator`'s
 * next render (driven by the session-change listener populating the Zustand
 * store) handles where the user lands, per ADR-001.
 *
 * Google OAuth (AUTH-2): `signInWithOAuth('google')` opens the OS browser;
 * the PKCE exchange and deep-link callback are handled by RootNavigator's
 * Linking listener (ADR-005, ADR-006).
 */
export function SignInScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);
  const [result, setResult] = useState<SignInResult | null>(null);
  const [oauthResult, setOAuthResult] = useState<OAuthSignInResult | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setResult(null);
    try {
      const outcome = await getSupabaseAdapter().signInWithPassword(email, password);
      setResult(outcome);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsOAuthSubmitting(true);
    setOAuthResult(null);
    try {
      const outcome = await getSupabaseAdapter().signInWithOAuth('google');
      setOAuthResult(outcome);
    } finally {
      setIsOAuthSubmitting(false);
    }
  }, []);

  const handleNavigateSignUp = useCallback(() => {
    navigation.navigate('SignUp');
  }, [navigation]);

  const handleNavigateForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPassword');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.signIn.title')}</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder={t('auth.signIn.emailPlaceholder')}
        style={styles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder={t('auth.signIn.passwordPlaceholder')}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {result?.type === 'invalid-credentials' ? (
        <Text style={styles.error}>{t('auth.signIn.invalidCredentials')}</Text>
      ) : null}
      {result?.type === 'unconfirmed-email' ? <UnconfirmedEmailPanel email={result.email} /> : null}
      <Button title={t('auth.signIn.submit')} onPress={handleSubmit} disabled={isSubmitting} />
      <View style={styles.divider}>
        <Text style={styles.dividerText}>{t('common.or')}</Text>
      </View>
      {oauthResult?.type === 'error' ? (
        <Text style={styles.error}>{t('auth.signIn.oauthError')}</Text>
      ) : null}
      <Button
        title={isOAuthSubmitting ? t('auth.signIn.openingGoogle') : t('auth.signIn.signInWithGoogle')}
        onPress={handleGoogleSignIn}
        disabled={isOAuthSubmitting}
      />
      <Text accessibilityRole="button" onPress={handleNavigateSignUp} style={styles.link}>
        {t('auth.signIn.needAccount')}
      </Text>
      <Text accessibilityRole="button" onPress={handleNavigateForgotPassword} style={styles.link}>
        {t('auth.signIn.forgotPassword')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  error: {
    color: '#b00020',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerText: {
    color: '#999',
  },
});
