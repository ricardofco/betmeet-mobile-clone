/**
 * AUTH-1's 60-second-per-email resend-confirmation cooldown (model.md §2).
 * The cooldown is **server-enforced** (system-context.md §3 — a capability
 * beyond Supabase Auth itself) and routed through `BackendApiClient`
 * (ADR-003) — this file models the shape of the rule and how to interpret
 * the backend's response, not the enforcement mechanism itself.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

export type ResendAttemptResult =
  | { type: 'sent' }
  | { type: 'throttled'; remainingSeconds: number };

/**
 * Backend response shape for the `auth.resendConfirmation` capability
 * (ADR-003). `remainingSeconds` is only meaningful when `throttled` is true.
 */
export type ResendConfirmationResponse = {
  throttled: boolean;
  remainingSeconds?: number;
};

export function classifyResendAttempt(response: ResendConfirmationResponse): ResendAttemptResult {
  if (response.throttled) {
    return { type: 'throttled', remainingSeconds: Math.max(0, response.remainingSeconds ?? RESEND_COOLDOWN_SECONDS) };
  }
  return { type: 'sent' };
}
