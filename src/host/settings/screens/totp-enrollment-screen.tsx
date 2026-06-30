import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
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
  const [enrollmentState, setEnrollmentState] = useState<TotpEnrollmentState>({ phase: 'idle' });
  const [code, setCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<MfaChallengeResult | null>(null);

  const handleStartEnrollment = useCallback(async () => {
    try {
      const { totpSecret, qrCodeUri, factorId } = await getSupabaseAdapter().enrollTotp();
      setEnrollmentState({ phase: 'pending-scan', totpSecret, qrCodeUri, factorId });
    } catch {
      setEnrollmentState({ phase: 'error', reason: 'Unable to start enrollment. Please try again.' });
    }
  }, []);

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
        <Text style={styles.title}>Two-factor authentication enabled</Text>
        <Text style={styles.body}>
          Your authenticator app is now linked. You will be asked for a code each time you sign in.
        </Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (enrollmentState.phase === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enrollment failed</Text>
        <Text style={styles.error}>{enrollmentState.reason}</Text>
        <Button title="Try again" onPress={handleRetry} />
      </View>
    );
  }

  // ── Verifying ─────────────────────────────────────────────────────────────
  if (enrollmentState.phase === 'verifying') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.body}>Verifying...</Text>
      </View>
    );
  }

  // ── Pending scan (QR code displayed) ─────────────────────────────────────
  if (enrollmentState.phase === 'pending-scan') {
    const { qrCodeUri, totpSecret } = enrollmentState;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan this QR code</Text>
        <Text style={styles.body}>
          Open your authenticator app (e.g. Google Authenticator or Authy) and scan the QR code below.
        </Text>
        <View style={styles.qrContainer}>
          <QRCode value={qrCodeUri} size={200} testID="qr-code" />
        </View>
        <Text style={styles.secretLabel}>
          Can't scan? Enter this code manually:
        </Text>
        <Text style={styles.secret} selectable>
          {totpSecret}
        </Text>
        <TextInput
          accessibilityLabel="Authentication code"
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setCode}
          placeholder="Enter 6-digit code"
          style={styles.input}
          value={code}
        />
        {verifyResult?.type === 'invalid-code' ? (
          <Text style={styles.error}>Incorrect code. Check your authenticator app and try again.</Text>
        ) : null}
        {verifyResult?.type === 'expired' ? (
          <Text style={styles.error}>Code expired. Enter the current code from your authenticator app.</Text>
        ) : null}
        {verifyResult?.type === 'error' ? (
          <Text style={styles.error}>Something went wrong. Please try again.</Text>
        ) : null}
        <Button
          title="Verify and enable"
          onPress={handleVerifyCode}
          disabled={code.length !== 6}
        />
      </View>
    );
  }

  // ── Idle (initial state) ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable two-factor authentication</Text>
      <Text style={styles.body}>
        Protect your account with an authenticator app. You will need to enter a 6-digit code each time you sign in.
      </Text>
      <Button title="Get started" onPress={handleStartEnrollment} />
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
