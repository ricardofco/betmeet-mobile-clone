# AUTH-8 — Secure session persistence

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As a user, I want to stay signed in across app restarts without my session being readable by other apps or easily extracted, so that my account stays both convenient and secure.

## Source rules

`migration-analysis.md` row on `@supabase/ssr` cookie-based sessions → RN session storage; requirements.md §7.5 (`react-native-keychain`).

## Acceptance criteria

- The Supabase session (refresh token in particular) is persisted via `react-native-keychain` (or the equivalent secure-storage backing configured into the Supabase RN client's custom storage adapter), not plain `AsyncStorage`.
- Restarting the app restores a valid session without requiring the user to sign in again, as long as the refresh token hasn't expired/been revoked.
- Signing out clears the stored session completely (no stale token survives a sign-out + sign-in-as-different-user sequence).
- This logic lives entirely inside the Supabase encapsulation adapter (`system-context.md §2`) — no feature module touches token storage directly.

## Dependencies

- `react-native-keychain`.
- The Supabase adapter (`system-context.md §2`).
