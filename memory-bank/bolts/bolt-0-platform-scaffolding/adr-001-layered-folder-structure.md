# ADR-001 — Layered folder structure (`domain` / `platform` / `shared` / `host` / `remotes`)

## Context

The repo has no `src/` yet. `system-architecture.md` mandates DDD layering (Domain → Application → UI/RN, dependencies pointing inward) and a host/remote split for Module Federation, but neither has concrete folders. `requirements.md §7.2` additionally requires a single, non-bypassable seam for all Supabase access.

## Decision

Introduce `src/` with five top-level folders:

- `src/domain/` — framework-free types and value objects (e.g. `AuthClaims`, `AuthSession`). No RN/Supabase/network imports. Unit-tested as plain TypeScript.
- `src/platform/` — the concrete implementations of the two boundary contracts (`SupabaseAdapter`, `BackendApiClient`) and any native-module wiring they need (e.g. `react-native-keychain`).
- `src/shared/` — Module-Federation-shared, framework-light modules that aren't strictly "domain" (starting with `scoring` once Bolt 4 lands).
- `src/host/` — host-bundle-only composition: navigation root, top-level providers, host-placed feature screens (auth, profile, predictions, notification-permission logic).
- `src/remotes/<remote-name>/` — one folder per federated remote; each remote-owning bolt fills its own folder.

Dependency rule: `domain` imports nothing from the other four; `platform`/`shared` never import from `host`/`remotes`; `host`/`remotes` may import `domain`/`platform`/`shared` freely.

A `@/*` → `src/*` TypeScript path alias is added (`tsconfig.json`), mirroring the source web app's own `@/*` → `src/` convention for cross-team familiarity — a consistency choice, not a spec requirement.

## Consequences

- Every later bolt has an unambiguous answer to "where does this code live" before writing any feature code.
- Enforcing the dependency direction is currently a code-review discipline, not a tooling-enforced rule — if violations become frequent, a future ADR could add an import-boundary lint rule (e.g. `eslint-plugin-boundaries`), but that tooling is not introduced now (avoiding scope creep in Bolt 0).
- The `@/*` alias must be kept in sync between `tsconfig.json` and the Rspack/Babel resolver config (Re.Pack resolves via its own `getResolveOptions()` plus whatever alias config is added) — a misconfiguration here would surface as a build-time "module not found," not a silent runtime bug, so the risk is low but worth a deliberate verification step in Implement.
