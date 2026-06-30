# ADR-014 — Default Avatar Picker Uses a Plain Grid, Not FlashList

**Date:** 2026-06-30
**Status:** Accepted
**Bolt:** 3 — Profile & Onboarding

---

## Context

`vercel-react-native-skills`' `list-performance-virtualize` rule (CRITICAL priority) prescribes FlashList over FlatList/plain views for list rendering as the default coding standard while writing components (per this project's skill-precedence rule in `CLAUDE.md`: "writing RN components → `vercel-react-native-skills`").

PROFILE-2's avatar picker renders the backend's seeded default-avatar set (model.md §2.5, `DefaultAvatarSetResult`) — or a small bundled local-fallback set if the remote fetch fails. Neither set is paginated or expected to be large; `system-context.md §3`'s Profile capability group describes this as a fixed "seeded set," not a scrollable feed.

---

## Decision

The default-avatar picker (`AvatarPicker` component, design.md §6) renders its option grid with a plain `View`/`ScrollView`-based layout, **not** FlashList.

Rationale: `list-performance-virtualize` exists to solve virtualization for **large, scrolling, potentially-unbounded** lists, where mounting every item up front causes real jank/memory cost. The avatar default set is small and bounded (expected ~6–12 options; even the local-fallback set is deliberately "small" per PROFILE-2's AC). Virtualizing a dozen static thumbnail images would add FlashList as a dependency, its estimated-item-size/layout configuration overhead, and indirection — for a workload where a plain grid has no measurable performance cost. This is a threshold judgment, not a rejection of the skill's general guidance: the skill's own framing is about *list performance*, and a 6–12-item grid is not a list-performance problem.

This is recorded as an ADR (rather than left as a design-doc footnote) specifically because it is a case where this project's per-skill precedence rule (CLAUDE.md: "if a skill's advice breaks an architectural rule... don't apply it silently — raise it") calls for raising the deviation explicitly, even though here it's a scale judgment rather than an architectural conflict.

List-item memoization (`list-performance-item-memo`), stable callback references (`list-performance-callbacks`), and avoiding inline style objects (`list-performance-inline-objects`) still apply to each avatar option's render — those rules are about per-item render cost, independent of whether the container is virtualized.

---

## Consequences

- No new dependency (`@shopify/flash-list`) introduced in this bolt for the avatar picker.
- If the backend-seeded default-avatar set ever grows materially (e.g. dozens+ of seasonal/promotional avatars), this ADR's premise ("small and bounded") no longer holds and the grid should be revisited — flagged here as the trigger condition, not a TODO left implicit in code.
- Any other list in this bolt that *is* unbounded/large (none identified — nickname/locale/settings rows are all small, fixed-count UI, not data-driven lists) would still default to FlashList per the skill, unaffected by this ADR's narrow scope.
