/**
 * AUTH-1's sign-up domain outcomes (model.md §2). Classification logic is
 * framework-free — no Supabase SDK import — per ADR-003: the platform
 * adapter calls into this, never the reverse.
 */
export type SignUpResult =
  | { type: 'pending-confirmation'; email: string }
  | { type: 'validation-error'; field: 'email' | 'password'; reason: string }
  | { type: 'error' };

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side pre-check mirroring the domain rule (password min length 8,
 * domain-overview.md §5.1) — a courtesy, never a substitute for the server's
 * own validation.
 */
export function validateSignUpInput(
  email: string,
  password: string,
): { field: 'email' | 'password'; reason: string } | null {
  if (!EMAIL_PATTERN.test(email)) {
    return { field: 'email', reason: 'Enter a valid email address.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { field: 'password', reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  return null;
}

/**
 * Maps a raw Supabase `signUp` SDK response/error into a `SignUpResult`.
 * Kept generic on the raw shape (rather than importing `@supabase/supabase-js`
 * types) so this stays a plain, dependency-free function the adapter calls
 * into — not the reverse (ADR-003).
 */
export function classifySignUpOutcome(
  email: string,
  raw: { error: { message: string } | null; hasSession: boolean },
): SignUpResult {
  if (raw.error) {
    return { type: 'error' };
  }
  // Supabase returns success with no active session when email confirmation
  // is required — the project is configured this way (confirmed at the
  // Design checkpoint): a freshly-signed-up user has no session until they
  // confirm. `hasSession: true` would mean confirmation isn't required by
  // the project config; still treated as the same outcome from this bolt's
  // perspective — AUTH-1's AC is "taken to an email-verification waiting
  // state" regardless, and the guard (rule 3) governs what happens once a
  // session does exist.
  return { type: 'pending-confirmation', email };
}
