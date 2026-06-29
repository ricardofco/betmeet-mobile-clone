# AUTH-1 — Email/password sign-up & sign-in

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As a new or returning user, I want to create an account or sign in with email and password, so that I can access the app.

## Source rules

`domain-overview.md §5.1`: password min length 8; unconfirmed-email sign-in returns a specific outcome (not a generic credential error) so the UI can offer resend/change-email inline; resend-confirmation throttled ≥60s per email (keyed by email, not user id).

## Acceptance criteria

- Sign-up requires a valid email and a password of at least 8 characters; on success, the user is taken to an email-verification waiting state.
- Sign-in with an unconfirmed email surfaces a distinct UI state (resend confirmation / change email) rather than a generic "invalid credentials" message.
- Sign-in with wrong credentials shows a generic error (no account-enumeration signal).
- "Resend confirmation" is rate-limited to once per 60 seconds per email address; a second tap within the window shows the remaining wait time, not a silent failure.
- On successful sign-in, the user lands on the onboarding gate or the app home depending on `onboarding_completed` (delegated to AUTH-7's guard logic).

## Out of scope

- The actual onboarding wizard UI (`unit-02-profile`).
- MFA challenge handling (AUTH-3).

## Dependencies

- Backend: cooldown enforcement for resend (system-context.md §3).
- AUTH-7 (navigation guard) for what happens immediately after sign-in succeeds.
