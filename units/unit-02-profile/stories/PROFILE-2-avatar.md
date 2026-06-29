# PROFILE-2 — Avatar selection and upload

**Unit:** `unit-02-profile` · **Placement:** Host

## Story

As a user, I want to set my avatar from a default set, my Google photo, or a custom upload, so that I can personalize my profile.

## Source rules

`domain-overview.md §5.2`: three avatar sources; a Google-photo avatar refreshes automatically on every sign-in **unless** the user has since uploaded a custom avatar — a custom upload is **never** silently overwritten; upload constraint: ≤5MB, jpeg/png/webp only.

## Acceptance criteria

- The user can pick an avatar from a seeded default set, use their Google profile photo (if signed in via Google), or upload a custom image via `react-native-image-picker`.
- A custom upload exceeding 5MB or not in {jpeg, png, webp} is rejected client-side with a specific error before attempting upload.
- Once a custom upload is active, signing in again via Google does **not** silently replace it — the custom upload persists until the user explicitly changes their avatar source again.
- Upload goes through the Supabase Storage signed-URL flow (`system-context.md §2`), not a direct multipart POST to a custom backend.
- If the default-avatar set fails to load (network/backend issue), the picker still renders a small bundled local fallback set rather than an empty screen (mirrors the web app's local-fallback behavior).

## Dependencies

- `react-native-image-picker`.
- Supabase Storage adapter.
