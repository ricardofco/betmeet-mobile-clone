import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { UnconfirmedEmailPanel } from '@/host/auth/screens/unconfirmed-email-panel';

export type VerifyEmailReason = 'post-signup' | 'unconfirmed-session';

export type VerifyEmailScreenParams = {
  email: string;
  reason: VerifyEmailReason;
};

/**
 * The merged confirmation/verify-email screen (ADR-004) — reachable from two
 * distinct triggers, never two components:
 *  - `reason: 'post-signup'` — direct navigation right after SignUpScreen's
 *    `pending-confirmation` result (no session yet, this project requires
 *    email confirmation before a session is issued — confirmed at the Design
 *    checkpoint). Reached while `public`/`auth-only`-classed, no guard
 *    involvement.
 *  - `reason: 'unconfirmed-session'` — AUTH-7 rule 3's redirect for an
 *    authenticated-but-unconfirmed-email session reached some other way
 *    (e.g. signing in again before confirming, or a future AUTH-2 OAuth
 *    edge case in Bolt 2). Whether this combination is reachable given the
 *    current Supabase config is a runtime question, not a code one — the
 *    guard rule and this screen exist regardless (AUTH-7 must reproduce the
 *    full rule table even if a row is not exercised by every flow yet).
 *
 * Renders the same `UnconfirmedEmailPanel` either way; only the heading copy
 * branches on `reason`.
 */
export function VerifyEmailScreen({ email, reason }: VerifyEmailScreenParams) {
  const { t } = useTranslation();
  const heading =
    reason === 'post-signup' ? t('auth.verifyEmail.postSignup') : t('auth.verifyEmail.unconfirmedSession');

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{heading}</Text>
      <UnconfirmedEmailPanel email={email} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
