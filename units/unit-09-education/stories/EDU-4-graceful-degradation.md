# EDU-4 — Graceful degradation of the interactive calculator

**Unit:** `unit-09-education` · **Placement:** Remote

## Story

As a user, I want the Rules Center to still be usable even if the interactive calculator has a problem, so that a minor bug in one widget doesn't take away the whole screen.

## Source rules

`domain-overview.md` (education's error-boundary pattern — "a failing client island never breaks the page"): a failing interactive calculator degrades to a static scoring-rules table, not a crashed/blank screen.

## Acceptance criteria

- A simulated failure inside the calculator component (e.g. a thrown error during render) is caught at the component boundary and replaced with a static, always-correct scoring-rules table — the rest of the Rules Center screen remains fully functional.
- This degradation is verified with an explicit test that forces the failure path, not just asserted by inspection.

## Dependencies

- EDU-2 (the component this protects).
