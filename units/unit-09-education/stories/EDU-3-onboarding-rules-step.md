# EDU-3 — Onboarding rules step

**Unit:** `unit-09-education` · **Placement:** Remote (invoked from the host-bundle onboarding wizard)

## Story

As a new user, I want a brief, skippable introduction to the scoring rules during onboarding, so that I have the option to learn upfront without being forced to.

## Source rules

`domain-overview.md §4.4`: the `rules` onboarding step is explicitly skippable, never blocks completion, and persists no "seen rules" state.

## Acceptance criteria

- The onboarding rules step shows a condensed version of EDU-1's content (or a teaser leading into the full Rules Center) with a clear "skip" option always visible.
- Skipping or completing this step has no different effect on onboarding progression — both simply advance to the next step.
- No state is persisted indicating whether the user "has seen" this step; revisiting the full Rules Center later from Settings/menu is always available regardless of onboarding history.

## Dependencies

- `unit-02-profile` PROFILE-4 (the wizard shell that hosts this step).
- EDU-1 (content reused/teased here).
