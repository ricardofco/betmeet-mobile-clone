import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSupabaseAdapter, type PasswordResetRequestResult } from '@/platform/supabase/supabase-adapter';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/**
 * AUTH-4 step 1 — password reset request. The user enters their email; the
 * app calls `requestPasswordReset`. On `sent`, a confirmation message is
 * shown (no account enumeration: the same message regardless of whether the
 * account exists). `invalid-email` shows a client-side validation message.
 *
 * Screen class: `public` + `auth-only` (same as SignIn — unauthenticated
 * users reach it, authenticated users are bounced to Home by rule 4).
 */
export function ForgotPasswordScreen({ navigation: _navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PasswordResetRequestResult | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const outcome = await getSupabaseAdapter().requestPasswordReset(email);
      setResult(outcome);
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

  if (result?.type === 'sent') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent a password-reset link to {email}. Tap the link in the email to set a new password.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.body}>
        Enter your email address and we will send you a link to reset your password.
      </Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />
      {result?.type === 'invalid-email' ? (
        <Text style={styles.error}>Enter a valid email address.</Text>
      ) : null}
      {result?.type === 'error' ? (
        <Text style={styles.error}>Something went wrong. Please try again.</Text>
      ) : null}
      {isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <Button title="Send reset link" onPress={handleSubmit} disabled={isSubmitting || email.length === 0} />
      )}
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
  body: {
    color: '#555',
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
});
