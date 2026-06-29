# PROFILE-3 — Locale preference

**Unit:** `unit-02-profile` · **Placement:** Host

## Story

As a user, I want to choose between Spanish and English, so that I can use the app in my preferred language.

## Source rules

`domain-overview.md §2`: `es` default, `en` available; explicit user choice always wins over any device default; no URL-prefix concept applies to mobile (that was a web-specific non-decision anyway).

## Acceptance criteria

- A locale switch is available (e.g. in settings); changing it updates all visible copy immediately without requiring an app restart.
- The choice persists across app restarts (device-local storage) and syncs to the user's profile so it's consistent if they sign in on another device.
- A first-time user's locale defaults to `es` regardless of device language, unless Construction decides otherwise as an explicit, recorded UX call (not silently inferred from `domain-overview.md`, which only documents the web app's own default).

## Dependencies

- Backend profile-locale sync (`system-context.md §3`).
