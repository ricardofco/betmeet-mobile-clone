import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSupabaseAdapter, type ChangeEmailResult } from '@/platform/supabase/supabase-adapter';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangeEmail'>;

/**
 * AUTH-5 — change email for an already-authenticated user. Supabase sends a
 * confirmation link to the new address; the change takes effect once the
 * user confirms. On `confirmation-sent`, shows a message instructing the user
 * to check their new email address.
 */
export function ChangeEmailScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ChangeEmailResult | null>(null);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setResult(null);
    try {
      const outcome = await getSupabaseAdapter().changeEmail(newEmail);
      setResult(outcome);
    } finally {
      setIsSubmitting(false);
    }
  }, [newEmail]);

  if (result?.type === 'confirmation-sent') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('settings.changeEmail.checkNewEmailTitle')}</Text>
        <Text style={styles.body}>{t('settings.changeEmail.confirmationSentBody', { email: newEmail })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.changeEmail.title')}</Text>
      <Text style={styles.body}>{t('settings.changeEmail.body')}</Text>
      <TextInput
        accessibilityLabel="New email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setNewEmail}
        placeholder={t('settings.changeEmail.placeholder')}
        style={styles.input}
        value={newEmail}
      />
      {result?.type === 'invalid-email' ? (
        <Text style={styles.error}>{result.reason}</Text>
      ) : null}
      {result?.type === 'error' ? (
        <Text style={styles.error}>{t('settings.changeEmail.genericError')}</Text>
      ) : null}
      {isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <Button title={t('settings.changeEmail.submit')} onPress={handleSubmit} disabled={isSubmitting || newEmail.length === 0} />
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
