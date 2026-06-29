# System Architecture

> Set during Inception (system-context) and refined during Construction (Design + ADRs).

## Current state (detected)
- Single-target RN CLI starter app — `App.tsx` still renders `@react-native/new-app-screen`'s `NewAppScreen`. No host/remote split exists yet.
- `rspack.config.mjs` wires only `Repack.RepackPlugin()` with default resolve/asset rules — no `ModuleFederationPlugin` config, no remotes registered.
- Run `/repack-init` to scaffold the actual host + remote Module Federation topology before any feature work that should live in a remote.

## Module Federation topology (Re.Pack)
- **Host app:** boots the runtime, owns core navigation + auth, resolves and mounts remotes.
- **Remotes:** independently buildable/deployable feature chunks, downloaded on demand.
- Diagram the host → remote relationships here as the project grows.

## Rules
- A feature that requires **native modules** cannot be a pure-JS remote — keep it in the host or a native-aware container. Record the decision as an ADR.
- Remote chunk URLs are environment-aware (dev server vs. prod CDN).
- Always design a **graceful fallback** when a remote fails to download.
- Version skew: host and remotes must share compatible singleton versions; document the contract.

## DDD layering (Construction)
- **Domain** (entities, value objects, ubiquitous language) — framework-free, testable.
- **Application** (use cases) — orchestrates domain.
- **UI / RN** — components, navigation, native bindings.

## ADRs
Each non-trivial architectural decision → `memory-bank/bolts/{bolt-id}/adr-NNN.md` (context / decision / consequences).
