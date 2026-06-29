# COMPETITION-3 — Team and flag display data

**Unit:** `unit-04-competition` · **Placement:** Remote or shared

## Story

As a user, I want to see correct team names, codes, and flags, so that matches are easy to recognize at a glance.

## Source rules

`domain-overview.md §5.9` / `§8`: "ISO 3-letter code" in this product means the **FIFA trigram** (e.g. `GER`, `NED`), not actual ISO 3166-1 alpha-3 — don't conflate the two; England/Scotland/Wales use UK-subdivision flags (`gb-eng`/`gb-sct`/`gb-wls`), not invalid "country" flags, since they aren't ISO countries.

## Acceptance criteria

- Every team displays its FIFA trigram (not a generic ISO alpha-3 code) alongside its flag and full name.
- The four UK home-nations teams that can appear in the tournament render their correct subdivision flag, not a missing/fallback flag.
- Flags are bundled as app assets (matching the web app's "vendored, no runtime hotlink" approach) rather than fetched from a remote CDN at runtime, for offline-safe rendering once loaded.

## Dependencies

- COMPETITION-1 (consumes this display data).
