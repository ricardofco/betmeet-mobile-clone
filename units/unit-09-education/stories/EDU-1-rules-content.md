# EDU-1 — Rules Center content

**Unit:** `unit-09-education` · **Placement:** Remote

## Story

As a user, I want to read how scoring, predictions, and leagues work, so that I understand the rules of the game.

## Source rules

`domain-overview.md` (content/rules topic set): scoring, penalty-winner rules, prediction lock timing, ranking ties, league types — bilingual (`es`/`en`).

## Acceptance criteria

- The same topic set as the web app's Rules Center is available, in both `es` and `en`, matching the user's current locale preference (`unit-02-profile` PROFILE-3).
- Content is navigable as distinct sections/accordion-style entries, not a single undifferentiated wall of text.
- This screen requires authentication to view (mirroring the web app's deliberate "rules require a session" rule), unlike a typical "help" screen that might be public.

## Dependencies

- `unit-02-profile` (locale).
- `unit-01-auth` (auth-required gate).
