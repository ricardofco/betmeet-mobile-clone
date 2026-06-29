# AUTH-5 — Change password & change email (confirmed and unconfirmed accounts)

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As an authenticated user, I want to change my password or my email address from account settings, so that I can keep my credentials current.

## Source rules

`domain-overview.md §5.1`: changing password requires re-entering the current password first (re-authentication); "Secure email change" is **deliberately disabled** — only the new address must confirm, the old address is never asked to confirm or notified (a recorded, accepted tradeoff, not a gap to "fix"); changing the email of an **unconfirmed** account is a distinct flow from changing a confirmed account's email (different proof-of-ownership path), also subject to the 60-second cooldown shared with resend-confirmation.

## Acceptance criteria

- **Change password**: requires the current password to verify before accepting a new one (min 8 characters + confirmation match); wrong current password shows a specific "current password incorrect" error, not a generic failure.
- **Change email (confirmed account)**: only the new email address receives a confirmation link; the old address is never contacted. The change does not take effect until the new address confirms.
- **Change email (unconfirmed account)**: a distinct entry point/flow (verifying the original password against the still-unconfirmed account), subject to the same 60-second per-email cooldown as resend-confirmation; the new email is different from the current one (case-insensitive check) or the request is rejected.
- Both email-change flows use the deep-link confirmation mechanism established in AUTH-4, not a browser redirect.

## Out of scope

- Account deletion (AUTH-6).

## Dependencies

- Shared cooldown mechanism with AUTH-1's resend-confirmation (same backend throttle, keyed by email).
- Deep linking.
