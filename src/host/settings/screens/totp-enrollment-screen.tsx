import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getSupabaseAdapter, type MfaChallengeResult } from '@/platform/supabase/supabase-adapter';
import type { TotpEnrollmentState } from '@/platform/supabase/supabase-adapter';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'TotpEnrollment'>;

/**
 * AUTH-3 — TOTP enrollment wizard for authenticated users (Settings area).
 * Multi-step flow driven by local `TotpEnrollmentState` (ephemeral — not in
 * Zustand; see design.md §3.2). ADR-007: QR code rendered by
 * `react-native-qrcode-svg` (wraps `react-native-svg`).
 *
 * Phase transitions:
 *   idle → (enrollTotp) → pending-scan → (user enters code) → verifying
 *   → (verifyTotpEnrollment) → verified | error
 */
export function TotpEnrollmentScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();
  const [enrollmentState, setEnrollmentState] = useState<TotpEnrollmentState>({ phase: 'idle' });
  const [code, setCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<MfaChallengeResult | null>(null);

  const handleStartEnrollment = useCallback(async () => {
    try {
      const { totpSecret, qrCodeUri, factorId } = await getSupabaseAdapter().enrollTotp();
      setEnrollmentState({ phase: 'pending-scan', totpSecret, qrCodeUri, factorId });
    } catch {
      setEnrollmentState({ phase: 'error', reason: t('settings.totpEnrollment.startError') });
    }
  }, [t]);

  const handleVerifyCode = useCallback(async () => {
    if (enrollmentState.phase !== 'pending-scan') return;
    const { factorId } = enrollmentState;
    setEnrollmentState({ phase: 'verifying', factorId, challengeId: '' });
    setVerifyResult(null);

    const outcome = await getSupabaseAdapter().verifyTotpEnrollment(factorId, code);
    setVerifyResult(outcome);

    if (outcome.type === 'verified') {
      setEnrollmentState({ phase: 'verified' });
    } else {
      // Return to pending-scan so user can retry — factorId is preserved.
      setEnrollmentState({ phase: 'pending-scan', totpSecret: '', qrCodeUri: '', factorId });
    }
  }, [enrollmentState, code]);

  const handleRetry = useCallback(() => {
    setEnrollmentState({ phase: 'idle' });
    setCode('');
    setVerifyResult(null);
  }, []);

  // ── Verified ─────────────────────────────────────────────────────────────
  if (enrollmentState.phase === 'verified') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('settings.totpEnrollment.enabledTitle')}</Text>
        <Text style={styles.body}>{t('settings.totpEnrollment.enabledBody')}</Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (enrollmentState.phase === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('settings.totpEnrollment.failedTitle')}</Text>
        <Text style={styles.error}>{enrollmentState.reason}</Text>
        <Button title={t('settings.totpEnrollment.tryAgain')} onPress={handleRetry} />
      </View>
    );
  }

  // ── Verifying ─────────────────────────────────────────────────────────────
  if (enrollmentState.phase === 'verifying') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.body}>{t('settings.totpEnrollment.verifyingBody')}</Text>
      </View>
    );
  }

  // ── Pending scan (QR code displayed) ─────────────────────────────────────
  if (enrollmentState.phase === 'pending-scan') {
    const { qrCodeUri, totpSecret } = enrollmentState;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('settings.totpEnrollment.scanTitle')}</Text>
        <Text style={styles.body}>{t('settings.totpEnrollment.scanBody')}</Text>
        <View style={styles.qrContainer}>
          <QRCode value={qrCodeUri} size={200} testID="qr-code" />
        </View>
        <Text style={styles.secretLabel}>{t('settings.totpEnrollment.manualEntryLabel')}</Text>
        <Text style={styles.secret} selectable>
          {totpSecret}
        </Text>
        <TextInput
          accessibilityLabel="Authentication code"
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setCode}
          placeholder={t('settings.totpEnrollment.codePlaceholder')}
          style={styles.input}
          value={code}
        />
        {verifyResult?.type === 'invalid-code' ? (
          <Text style={styles.error}>{t('settings.totpEnrollment.invalidCode')}</Text>
        ) : null}
        {verifyResult?.type === 'expired' ? (
          <Text style={styles.error}>{t('settings.totpEnrollment.expired')}</Text>
        ) : null}
        {verifyResult?.type === 'error' ? (
          <Text style={styles.error}>{t('settings.totpEnrollment.error')}</Text>
        ) : null}
        <Button
          title={t('settings.totpEnrollment.verifyAndEnable')}
          onPress={handleVerifyCode}
          disabled={code.length !== 6}
        />
      </View>
    );
  }

  // ── Idle (initial state) ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.totpEnrollment.idleTitle')}</Text>
      <Text style={styles.body}>{t('settings.totpEnrollment.idleBody')}</Text>
      <Button title={t('settings.totpEnrollment.getStarted')} onPress={handleStartEnrollment} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
  },
  secretLabel: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
  secret: {
    fontFamily: 'monospace',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 2,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 6,
  },
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
});
