import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { validateSignUpInput, type SignUpResult } from '@/domain/auth/sign-up';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

/**
 * AUTH-1's sign-up form. Branches on the single `SignUpResult` discriminated
 * union returned by the adapter — not a pile of independent booleans
 * (design.md §5 apply-now flag: avoid boolean-prop/state-slot proliferation).
 */
export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SignUpResult | null>(null);

  async function handleSubmit() {
    const validationError = validateSignUpInput(email, password);
    if (validationError) {
      setResult({ type: 'validation-error', ...validationError });
      return;
    }

    setIsSubmitting(true);
    try {
      const outcome = await getSupabaseAdapter().signUp(email, password);
      setResult(outcome);
      if (outcome.type === 'pending-confirmation') {
        navigation.navigate('VerifyEmail', { email: outcome.email, reason: 'post-signup' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
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
        placeholder="Password (min. 8 characters)"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {result?.type === 'validation-error' ? <Text style={styles.error}>{result.reason}</Text> : null}
      {result?.type === 'error' ? <Text style={styles.error}>Something went wrong. Try again.</Text> : null}
      <Button title="Sign up" onPress={handleSubmit} disabled={isSubmitting} />
      <Text accessibilityRole="button" onPress={() => navigation.navigate('SignIn')} style={styles.link}>
        Already have an account? Sign in
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
