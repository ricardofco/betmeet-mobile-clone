# ADR-005 — `scoring` ships as a shared-singleton module, not a separate workspace package

## Context

`requirements.md §7.4`/`§8` explicitly deferred the exact packaging mechanism for the `scoring` algorithm (`unit-03-scoring`) to a Construction ADR, while fixing the requirement that it must be a single source of truth importable by the host and every remote. The repo has no monorepo/workspace tooling today (single `package.json`, no `workspaces` field).

## Decision

`scoring` lives as a plain folder at `src/shared/scoring/` (per ADR-001's folder structure) and is registered as a Module Federation **shared singleton** (ADR-002's `shared` config) — it is **not** split into a separate npm package or a Yarn/npm workspace.

Rationale: Module Federation's `shared` mechanism already guarantees host and every remote resolve the exact same runtime instance of a shared module, without requiring a second package boundary to achieve that guarantee. Introducing real workspace tooling solely to host one pure-logic module would be infrastructure overhead with no behavioral benefit at this repo's current size.

## Consequences

- `unit-03-scoring`'s bolt (Bolt 4) implements directly inside `src/shared/scoring/`, no package-publishing or workspace-linking step.
- If the repo later accumulates enough shared/federated code that a true workspace split becomes valuable (e.g. multiple genuinely independent packages with their own versioning), that is a new, separate ADR at that time — not a reversal of this one, since the trigger condition (repo scale) hasn't occurred yet.
- The "single source of truth" guarantee from `requirements.md §7.4` rests on the Module Federation `shared` config being correct and version-pinned (ADR-002's consequence) — a misconfigured `shared` entry would silently let a remote bundle its own copy of `scoring`, defeating the purpose without an obvious error. Worth an explicit verification step (e.g. inspecting the built remote bundle for a duplicated `scoring` module) during this bolt's Test stage.
