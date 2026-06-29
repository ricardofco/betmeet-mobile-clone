import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { classifyResendAttempt, type ResendAttemptResult } from '@/domain/auth/resend-cooldown';
import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';

type UnconfirmedEmailPanelProps = {
  email: string;
};

/**
 * Shared resend/change-email affordance (design.md §4), reused by both
 * SignInScreen's unconfirmed branch and VerifyEmailScreen — one composed
 * component, not duplicated per screen (vercel-composition-patterns).
 *
 * The 1-second countdown tick is scoped entirely to this component's own
 * local state — it never touches the Zustand auth-session store or a parent
 * screen's state, so the tick doesn't cause unrelated re-renders elsewhere
 * (design.md §5 apply-now flag).
 *
 * "Change email" is an explicit extension seam for AUTH-5 (Bolt 2) — not
 * built here per the unit brief; the affordance is omitted rather than
 * shipped half-built.
 */
export function UnconfirmedEmailPanel({ email }: UnconfirmedEmailPanelProps) {
  const [result, setResult] = useState<ResendAttemptResult | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCountdown(seconds: number) {
    setRemainingSeconds(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemainingSeconds(previous => {
        if (previous <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    setIsSending(true);
    try {
      const response = await getBackendApiClient().resendConfirmation(email);
      const classified = classifyResendAttempt(response);
      setResult(classified);
      if (classified.type === 'throttled') {
        startCountdown(classified.remainingSeconds);
      }
    } finally {
      setIsSending(false);
    }
  }

  const isThrottled = remainingSeconds > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.email}>{email}</Text>
      <Button
        title={isThrottled ? `Resend in ${remainingSeconds}s` : 'Resend confirmation'}
        onPress={handleResend}
        disabled={isSending || isThrottled}
      />
      {result?.type === 'sent' ? <Text style={styles.status}>Confirmation email sent.</Text> : null}
      {result?.type === 'throttled' ? (
        <Text style={styles.status}>Please wait before requesting another email.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    alignItems: 'center',
  },
  email: {
    fontWeight: '600',
  },
  status: {
    textAlign: 'center',
  },
});
