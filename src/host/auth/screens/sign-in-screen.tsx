import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SignInResult } from '@/domain/auth/sign-in';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { UnconfirmedEmailPanel } from '@/host/auth/screens/unconfirmed-email-panel';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

/**
 * AUTH-1's sign-in form. `unconfirmed-email` renders `UnconfirmedEmailPanel`
 * inline (AC: not a generic credential error); `invalid-credentials` shows
 * one generic message (anti-enumeration). `signed-in` does nothing itself —
 * `AuthGatedNavigator`'s next render (driven by the session-change listener
 * populating the Zustand store) handles where the user lands, per ADR-001.
 */
export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SignInResult | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const outcome = await getSupabaseAdapter().signInWithPassword(email, password);
      setResult(outcome);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {result?.type === 'invalid-credentials' ? (
        <Text style={styles.error}>Incorrect email or password.</Text>
      ) : null}
      {result?.type === 'unconfirmed-email' ? <UnconfirmedEmailPanel email={result.email} /> : null}
      <Button title="Sign in" onPress={handleSubmit} disabled={isSubmitting} />
      <Text accessibilityRole="button" onPress={() => navigation.navigate('SignUp')} style={styles.link}>
        Need an account? Sign up
      </Text>
      <Text accessibilityRole="button" onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
        Forgot password?
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
});
