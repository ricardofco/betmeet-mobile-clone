# Unit Brief — `unit-01-auth`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Host bundle (requirements.md §7.4 — gates all navigation, must never depend on a remote-chunk download).

## Purpose

Identity and session management: email/password and Google OAuth sign-in, TOTP second factor, password/email change, account deletion, and — most critically — the navigation-gate state machine that decides, on every screen entry, whether the current user may proceed (the mobile equivalent of `betmeet-clone`'s `proxy.ts`).

## Source rules

`domain-overview.md §5.1` (auth & account rules), `§6` (the request-gating state machine, verbatim rule ordering), `§4.3` (verification-status state machine). Migration mechanics: `migration-analysis.md` rows on Server Actions, Middleware, cookie sessions, PKCE/token_hash, WebAuthn passkeys.

## In scope

- Email/password sign-up, sign-in, sign-out.
- Google OAuth sign-in with account auto-linking to an existing email.
- TOTP MFA: enrollment, challenge during sign-in, disable.
- Forgot/reset password.
- Change password (requires re-authentication with current password).
- Change email — both the confirmed-account flow and the distinct unconfirmed-account flow.
- Resend email confirmation, with cooldown.
- Account deletion (two-step: pool-ownership resolution hand-off to `unit-06-pools`, then soft-delete + hard-delete).
- The session/navigation guard: decode JWT claims (`account_deleted`, `email_verified`, `onboarding_completed`) and gate navigation accordingly, with the same fail-open-on-absence / strict-on-explicit-value semantics as the source app.
- Secure session persistence (refresh token in `react-native-keychain`).
- Deep-link handling for email-confirmation continuation and any auth-related universal/app links.

## Explicitly out of scope (this unit)

- **Native passkeys** — deferred per requirements.md §7.5; do not build, but leave the MFA architecture able to add a second native-credential type later without a rewrite.
- Onboarding wizard steps themselves (nickname/avatar/rules/notifications/passkey-or-equivalent) — that's `unit-02-profile`; this unit only owns the `onboarding_completed` gate check, not the wizard UI.

## Dependencies

- **Depended on by:** every other unit (the navigation guard and a valid session are prerequisite to all authenticated screens).
- **Depends on:** none upstream within this app — this is the foundational unit. Build first.
- **Cross-unit integration point:** `unit-06-pools` must supply the pool-ownership-transfer step invoked during account deletion (AUTH-6).

## Native modules

- `react-native-keychain` (secure refresh-token storage).
- `react-native-svg` (TOTP enrollment QR code).
- Deep linking: `betmeet://` custom scheme + Universal Links (iOS) / App Links (Android).

## Backend contract needed

See `system-context.md §3` "Auth flows requiring server logic beyond Supabase Auth itself" — cooldown enforcement, soft-delete/hard-delete orchestration, pool-ownership-transfer-on-deletion. Direct-to-Supabase for the rest (sign-in/up, OAuth, MFA, session) per requirements.md §7.1.

## Unit-level acceptance criteria

- A user can complete every auth flow listed in "In scope" on both iOS and Android.
- The navigation guard reproduces the exact rule ordering and fail-open semantics documented in `domain-overview.md §6` — verified against a written-out table of claim combinations × expected outcome (see AUTH-7).
- No screen anywhere in the app can be reached by an unauthenticated, unconfirmed, soft-deleted, or onboarding-incomplete user except where the source rule explicitly allows it (e.g. public screens, the verify-email screen itself).

## Risks (carried from migration-analysis.md)

- **High risk**: passkey deferral must be a clean seam, not a half-built feature — confirm with Construction that the TOTP-only MFA design doesn't structurally block adding passkeys later.
- The PKCE/token_hash dual email-confirmation flow needs a genuinely new design as deep links, not a port — flagged in AUTH-2/AUTH-4 stories.

## Stories

See `stories/` in this unit directory: AUTH-1 through AUTH-8.
