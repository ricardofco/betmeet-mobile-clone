# NOTIF-1 — Push permission request and device-token registration

**Unit:** `unit-08-notifications` · **Placement:** Host

## Story

As a user, I want to be asked once, at a sensible point, whether I'd like push notifications, so that I'm not nagged but can still opt in easily.

## Source rules

requirements.md §7.5 (FCM/APNs direct); `domain-overview.md §4.4` (the onboarding notifications step is where this is naturally first triggered, and a success here sets all 5 preferences true at once — a deliberate shortcut).

## Acceptance criteria

- The permission request is triggered from the onboarding notifications step (`unit-02-profile` PROFILE-4) and, separately, available again later from the preferences screen (NOTIF-2) if the user skipped or later wants to enable it.
- On permission grant, the resulting platform push token (FCM or APNs) is registered with the backend, tied to the current user.
- On permission denial, the app does not repeatedly prompt — it shows a one-time explanation of how to enable it later via OS settings.
- If the OS rotates the token (app reinstall, OS-level refresh), the new token is re-registered automatically without requiring the user to do anything.

## Out of scope

- The preferences screen UI (NOTIF-2).

## Dependencies

- `unit-01-auth` (session required to tie a token to a user).
- Backend device-token registration contract.
