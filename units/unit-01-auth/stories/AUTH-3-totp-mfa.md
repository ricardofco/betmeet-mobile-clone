# AUTH-3 — TOTP MFA enrollment and challenge

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As a security-conscious user, I want to enable a TOTP authenticator app as a second factor, so that my account is protected even if my password leaks.

## Source rules

`domain-overview.md §5.1`; native passkeys are explicitly **out of scope at launch** (requirements.md §7.5) — TOTP is the only second factor.

## Acceptance criteria

- A user can enroll a TOTP factor from account settings: the app displays a QR code (rendered via `react-native-svg` from the secret/URI Supabase Auth returns) and a manual-entry secret as a fallback for devices that can't scan.
- Enrollment requires entering one valid code from the authenticator app before the factor is considered active.
- A user with an active TOTP factor is challenged for a code after password sign-in succeeds, before reaching the app (mirrors the web app's "aal1-pending" gate — the navigation guard in AUTH-7 must let a pending-MFA session reach the challenge screen without bouncing it elsewhere).
- A user can disable their TOTP factor from settings (with re-authentication, consistent with AUTH-5's re-auth pattern for sensitive changes).
- This story leaves a clean seam for a future native-passkey second factor (e.g., the MFA challenge screen is written to support more than one factor type) without committing to that design now.

## Out of scope

- Native passkeys (any platform).

## Dependencies

- `react-native-svg`.
- AUTH-7 (the guard must recognize and not block an "MFA-pending" session state, only completed/confirmed sessions).
