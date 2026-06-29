# ADR-006 — `@/*` → `src/*` TypeScript path alias

## Context

The repo has no path alias configured (`tsconfig.json` only extends `@react-native/typescript-config`). The source web app (`betmeet-clone`) uses a `@/*` → `src/` convention (`project-inventory.md`). `requirements.md §7.3` forbids any code dependency between the two repos, but a shared *naming convention* is not a code dependency and costs nothing to adopt.

## Decision

Add a `@/*` → `src/*` path alias to `tsconfig.json`'s `compilerOptions.paths`, and configure the equivalent resolver alias in the Re.Pack/Rspack config so the alias resolves identically at build time (Rspack's `resolve.alias`, alongside `Repack.getResolveOptions()`).

## Consequences

- Import paths read consistently with the web codebase's convention, easing context-switching for anyone working across both repos — purely a developer-experience choice, not a functional requirement.
- The alias must be added in **two places** (`tsconfig.json` for type-checking/editor support, and the Rspack config for actual bundling) — a future dependency or config upgrade that resets one without the other would surface immediately as a build error, not a silent bug, so this is a low-risk, easily-caught failure mode.
