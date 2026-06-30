# ADR-015 — `scoring` is not registered in the Module Federation `shared` config

## Context

ADR-005 (Bolt 0) decided that `scoring` would ship as a shared-singleton module under `src/shared/scoring/` and stated that "The 'single source of truth' guarantee rests on the Module Federation `shared` config being correct." ADR-002 (Bolt 0) echoed this: "from Bolt 4 onward, `scoring`" should appear in the `shared` config alongside `react`, `react-native`, and the navigation libraries.

At Bolt 4 implement time, Bolt 0's anticipation is re-evaluated against the concrete package's properties:

- Module Federation's `shared` config is designed for **npm packages**: it matches against the import-request string (the package name), reads the installed `version` from the package's `package.json`, and at runtime negotiates with other containers to load only one copy of a given version range. This mechanism prevents duplicate React or Zustand instances — stateful singletons where two separate JavaScript objects would cause split-brain behavior.
- `src/shared/scoring/` is a **local source folder**, not an npm package. It has no `package.json`, no `version` field. There is one physical copy on disk, shared by host and remotes at the filesystem level.
- `scoring` exports only **pure functions and constants** — it carries no runtime state. If the host bundle and a remote bundle each include a copy of the compiled module, both copies run the same deterministic function on the same inputs and produce identical outputs. There is no runtime-divergence risk from having two compiled copies.

Registering it in `shared` with a synthetic/hand-maintained version (`{ singleton: true, version: '1.0.0' }`) would be non-standard, require manual version bumps on every algorithm change, and add complexity with no behavioral benefit. Re.Pack's `installedVersion()` helper (used for all current shared entries) reads the npm `package.json` — it has nothing to read for a local folder, making automatic version detection impossible.

## Decision

`scoring` is **not** added to the `shared` config in `rspack.config.mjs` or `rspack.config.education-remote.mjs`. The existing `shared` config (react, react-native, navigation libraries) is unchanged by this bolt.

The single-source-of-truth guarantee is upheld structurally:

1. There is one physical directory: `src/shared/scoring/`.
2. All consumers import via the `@/shared/scoring` alias, which resolves to that one directory in every build (host rspack config and every remote rspack config each declare `alias: { '@': path.resolve(__dirname, 'src') }`).
3. A compile-time alias mismatch would produce a build-time "module not found" error, not a silent runtime divergence.

This is the same guarantee used by `src/domain/` and `src/platform/` — both of which are also local source layers imported via `@/` and explicitly excluded from the MF `shared` config by ADR-002 ("domain/ and platform/ are bundled normally, not declared as MF-shared modules").

## Consequences

- `rspack.config.mjs` and `rspack.config.education-remote.mjs` are not modified by Bolt 4.
- If `scoring` ever becomes stateful (e.g. acquires a memoization cache that must be shared across host and remotes at runtime), this decision should be revisited — the correct path at that point is converting it to a real npm workspace package with a proper `package.json`, which then qualifies for MF `shared` registration. That is a new ADR at that time.
- ADR-005's consequence note ("Worth an explicit verification step — inspecting the built remote bundle for a duplicated `scoring` module") is noted but de-prioritised: for a stateless pure-function module, a duplicate copy is semantically harmless. The Layer 2 manual verification path for this bolt focuses on functional correctness, not bundle deduplication.
- This decision supersedes ADR-002's anticipation of adding `scoring` to the `shared` config. ADR-002 is not amended (it was correct at Bolt 0 under the information available then); this ADR records the updated reasoning once the concrete package's stateless nature was confirmed at Bolt 4.
