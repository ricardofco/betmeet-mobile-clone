import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSupabaseAdapter, type ChangePasswordResult } from '@/platform/supabase/supabase-adapter';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangePassword'>;

/**
 * AUTH-5 — change password for an already-authenticated user. Requires the
 * user's current password for re-auth (UI-level safeguard; model.md §2.10).
 * On `password-changed`, shows a success message. The session remains valid —
 * the guard does not re-evaluate (no session-change fires for a password
 * update of an already-signed-in user on Supabase).
 */
export function ChangePasswordScreen({ navigation: _navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ChangePasswordResult | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setResult(null);
    try {
      const outcome = await getSupabaseAdapter().changePassword(currentPassword, newPassword);
      setResult(outcome);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPassword, newPassword]);

  if (result?.type === 'password-changed') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password changed</Text>
        <Text style={styles.body}>Your password has been updated successfully.</Text>
      </View>
    );
  }

  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && !isSubmitting;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change password</Text>
      <TextInput
        accessibilityLabel="Current password"
        autoCapitalize="none"
        onChangeText={setCurrentPassword}
        placeholder="Current password"
        secureTextEntry
        style={styles.input}
        value={currentPassword}
      />
      <TextInput
        accessibilityLabel="New password"
        autoCapitalize="none"
        onChangeText={setNewPassword}
        placeholder="New password (min 8 characters)"
        secureTextEntry
        style={styles.input}
        value={newPassword}
      />
      {result?.type === 'validation-error' ? (
        <Text style={styles.error}>{result.reason}</Text>
      ) : null}
      {result?.type === 'error' ? (
        <Text style={styles.error}>Unable to change password. Check your current password and try again.</Text>
      ) : null}
      {isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <Button title="Save new password" onPress={handleSubmit} disabled={!canSubmit} />
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
