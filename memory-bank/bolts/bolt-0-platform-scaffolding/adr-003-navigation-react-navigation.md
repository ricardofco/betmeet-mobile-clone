# ADR-003 — Navigation library: React Navigation (native-stack)

## Context

`requirements.md §8` deferred the navigation library choice to Construction. `coding-standards.md` mandates "native navigators (not JS-only stacks)." `unit-01-auth`'s AUTH-7 (the navigation guard) is the very next bolt and needs a concrete navigation primitive to gate against.

## Decision

Adopt **React Navigation**, using its native-stack navigator (`@react-navigation/native-stack`) as the default navigator type. It is declared as a Module Federation shared singleton (ADR-002) so host and every remote resolve the same instance.

Rationale: it satisfies the native-navigator mandate, has mature TypeScript support (relevant given `coding-standards.md`'s strict-mode/no-`any` rule), is the de facto standard in the RN ecosystem (lowest onboarding/maintenance risk for future contributors), and has no known incompatibility with Re.Pack/Module Federation's singleton-sharing model.

## Consequences

- AUTH-7's navigation guard is implemented against React Navigation's primitives (e.g. a guard wrapping the navigator tree / a navigation-state listener) — this is now a fixed integration point for that story.
- Every remote's screens register into the host's navigator tree rather than running their own independent navigation root — this must be designed explicitly when each remote's bolt arrives (not a Bolt 0 deliverable, but a constraint this ADR creates for them).
- If a future bolt discovers a hard requirement React Navigation can't satisfy (unlikely, but possible with deep Module-Federation-specific navigation needs), revisiting this ADR is the correct path — not a silent per-feature workaround.
