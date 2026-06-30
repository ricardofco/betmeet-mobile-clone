import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSupabaseAdapter, type SetNewPasswordResult } from '@/platform/supabase/supabase-adapter';
import type { AuthStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetNewPassword'>;

/**
 * AUTH-4 step 3 — set new password. Reached after `exchangePasswordResetToken`
 * succeeds (deep-link handler in RootNavigator navigates here). The user
 * enters a new password; on `password-updated`, the session transitions to a
 * full authenticated session and the guard re-evaluates via `onSessionChange`.
 * The navigator doesn't need to do anything — `AuthGatedNavigator` re-renders
 * to the app tree automatically per ADR-001.
 */
export function SetNewPasswordScreen({ navigation: _navigation }: Props) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SetNewPasswordResult | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const outcome = await getSupabaseAdapter().setNewPassword(password);
      setResult(outcome);
    } finally {
      setIsSubmitting(false);
    }
  }, [password]);

  if (result?.type === 'password-updated') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.body}>Your password has been updated. Signing you in...</Text>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set new password</Text>
      <Text style={styles.body}>Enter your new password. It must be at least 8 characters.</Text>
      <TextInput
        accessibilityLabel="New password"
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder="New password"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {result?.type === 'validation-error' ? (
        <Text style={styles.error}>{result.reason}</Text>
      ) : null}
      {result?.type === 'error' ? (
        <Text style={styles.error}>Something went wrong. Please try again or request a new reset link.</Text>
      ) : null}
      {isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <Button title="Update password" onPress={handleSubmit} disabled={isSubmitting || password.length === 0} />
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
