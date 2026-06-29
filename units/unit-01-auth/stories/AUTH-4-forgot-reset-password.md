# AUTH-4 — Forgot / reset password

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As a user who forgot their password, I want to request a reset link and set a new password, so that I can regain access to my account.

## Source rules

`domain-overview.md §5.1`. The web app routes the reset link through its OAuth-callback exchange before reaching the actual reset-password screen, specifically so a recovery session exists before the password update call — the mobile deep-link equivalent must preserve that ordering (recovery session established before the "set new password" screen is reachable).

## Acceptance criteria

- A user can request a password reset by email; the response is the same regardless of whether the email exists (anti-enumeration — no signal either way).
- The reset email's link opens the app via deep link / Universal Link directly to a "set new password" screen, with a valid recovery session already established (not requiring a second sign-in step).
- The new password must be at least 8 characters and match its confirmation field.
- On success, the user is signed in with the new password and routed through the normal post-sign-in gate (AUTH-7).

## Out of scope

- Change-password for an already-authenticated user (that's AUTH-5).

## Dependencies

- Deep linking (custom scheme + Universal/App Links).
- AUTH-7 for post-reset routing.
