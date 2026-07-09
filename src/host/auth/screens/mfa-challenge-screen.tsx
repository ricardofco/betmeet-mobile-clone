import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSupabaseAdapter, type MfaChallengeResult } from '@/platform/supabase/supabase-adapter';
import { useAuthSessionStore } from '@/host/auth/auth-session-store';

/**
 * AUTH-3 — MFA challenge screen. Rendered by `MfaChallengeTree` when the
 * guard detects `aal1` session with `nextLevel: aal2` (ADR-008, rule 3.5).
 *
 * On mount: reads `mfaFactorId` from the Zustand store (set when this tree
 * is first rendered). If no factor ID is available yet, calls `getMfaFactors`
 * to discover it and stores the result. The factor ID is needed for
 * `challengeAndVerifyMfa`.
 *
 * On successful verification: `onSessionChange` fires with an `aal2` session.
 * `AuthGatedNavigator` re-renders to the app tree — this screen is unmounted
 * automatically. No explicit navigation call needed (ADR-001).
 *
 * No back button — this is the root of `MfaChallengeTree`. The user's only
 * exits are successful MFA or sign-out (ADR-008).
 *
 * Change-2026-07-08 (Omitted Requirement #3): this escape-hatch sign-out
 * link reuses the exact same `settings.rows.signOut` copy/i18n key as the
 * new deliberate sign-out row in `AccountSettingsScreen`, so both stay
 * worded identically per the change's own instruction.
 */
export function MfaChallengeScreen() {
  const { t } = useTranslation();
  const mfaFactorId = useAuthSessionStore(state => state.mfaFactorId);
  const setMfaFactorId = useAuthSessionStore(state => state.setMfaFactorId);

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFactor, setIsLoadingFactor] = useState(false);
  const [result, setResult] = useState<MfaChallengeResult | null>(null);

  useEffect(() => {
    if (mfaFactorId) return;
    setIsLoadingFactor(true);
    getSupabaseAdapter()
      .getMfaFactors()
      .then(({ factorId }) => {
        setMfaFactorId(factorId);
      })
      .finally(() => {
        setIsLoadingFactor(false);
      });
  }, [mfaFactorId, setMfaFactorId]);

  const handleSignOut = useCallback(async () => {
    await getSupabaseAdapter().signOut();
    setMfaFactorId(null);
  }, [setMfaFactorId]);

  const handleVerify = useCallback(async () => {
    if (!mfaFactorId) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const outcome = await getSupabaseAdapter().challengeAndVerifyMfa(mfaFactorId, code);
      setResult(outcome);
      if (outcome.type === 'verified') {
        // Guard re-evaluates on next onSessionChange — no navigation needed.
        setMfaFactorId(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [mfaFactorId, code, setMfaFactorId]);

  if (isLoadingFactor) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.mfaChallenge.title')}</Text>
      <Text style={styles.body}>{t('auth.mfaChallenge.body')}</Text>
      <TextInput
        accessibilityLabel="Authentication code"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setCode}
        placeholder={t('auth.mfaChallenge.codePlaceholder')}
        style={styles.input}
        value={code}
      />
      {result?.type === 'invalid-code' ? (
        <Text style={styles.error}>{t('auth.mfaChallenge.invalidCode')}</Text>
      ) : null}
      {result?.type === 'expired' ? (
        <Text style={styles.error}>{t('auth.mfaChallenge.expired')}</Text>
      ) : null}
      {result?.type === 'error' ? <Text style={styles.error}>{t('auth.mfaChallenge.error')}</Text> : null}
      {isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <Button title={t('auth.mfaChallenge.verify')} onPress={handleVerify} disabled={isSubmitting || code.length !== 6} />
      )}
      <Text accessibilityRole="button" onPress={handleSignOut} style={styles.link}>
        {t('settings.rows.signOut')}
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
  body: {
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  error: {
    color: '#b00020',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#555',
  },
});
