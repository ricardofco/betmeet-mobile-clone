/**
 * AUTH-1's sign-in domain outcomes (model.md §2). `unconfirmed-email` is a
 * structurally distinct outcome from the generic `invalid-credentials` so
 * the UI can offer resend/change-email inline, without leaking an
 * account-enumeration signal (no "no such account" vs. "wrong password"
 * split) — both AUTH-1 ACs, preserved here as the type's own shape.
 */
export type SignInResult =
  | { type: 'signed-in' }
  | { type: 'unconfirmed-email'; email: string }
  | { type: 'invalid-credentials' };

/**
 * Maps a raw Supabase `signInWithPassword` SDK error into a `SignInResult`.
 * Supabase surfaces an unconfirmed-email sign-in attempt as an
 * `email_not_confirmed` error code (or, on older SDK versions, a message
 * containing "Email not confirmed") — anything else collapses to the
 * generic `invalid-credentials` outcome, deliberately, so no other error
 * shape leaks account-existence information.
 */
export function classifySignInOutcome(
  email: string,
  raw: { error: { code?: string; message: string } | null },
): SignInResult {
  if (!raw.error) {
    return { type: 'signed-in' };
  }
  if (isUnconfirmedEmailError(raw.error)) {
    return { type: 'unconfirmed-email', email };
  }
  return { type: 'invalid-credentials' };
}

function isUnconfirmedEmailError(error: { code?: string; message: string }): boolean {
  if (error.code === 'email_not_confirmed') return true;
  return /email not confirmed/i.test(error.message);
}
