# Bolt 0 — Platform Scaffolding — Design Stage

> **Stage 2 of 5 (Design).** Component/data-flow design, host-vs-remote placement, navigation/state boundaries. Checkpoint: pause for approval before ADRs (where these proposals get formally decided/recorded).

## 1. Folder structure (DDD layering, `system-architecture.md`)

The repo has no `src/` yet (root-level `App.tsx`/`index.js`, RN CLI default). This bolt introduces the layered structure every later bolt builds into:

```
src/
  domain/                  # Model-stage output: framework-free types, zero RN/Supabase imports
    auth/
      auth-claims.ts        # AuthClaims, AuthSession (from model.md)
  platform/                # The two boundary-contract implementations (requirements.md §7.2)
    supabase/
      supabase-adapter.ts    # SupabaseAdapter interface + the one concrete implementation
      keychain-session-storage.ts  # react-native-keychain-backed storage, injected into the Supabase client config
    backend-api/
      backend-api-client.ts  # BackendApiClient interface + concrete implementation (fetch-based)
  shared/                  # Module-Federation shared singletons that aren't "domain" or "platform"
    scoring/                # unit-03-scoring's package lands here in its own bolt — folder reserved now
  host/                    # Host-bundle-only composition (navigation root, providers, host screens)
  remotes/                 # One folder per federated remote; each remote's own bolt fills its contents
    <remote-name>/
```

**Rule this fixes for every later bolt:** `domain/` never imports from `platform/`, `shared/`, `host/`, or `remotes/`; `platform/` never imports from `host/`/`remotes/`. Dependencies point inward (UI → platform/shared → domain), never outward. This is the same Domain/Application/UI-RN layering `system-architecture.md` already mandates — Bolt 0 just gives it concrete folders.

A `@/*` → `src/*` TypeScript path alias is added (mirrors the source web app's own convention, per `project-inventory.md` — a deliberate, low-cost consistency choice, not a requirement of any spec).

## 2. Module Federation topology

`system-architecture.md` already states the rule: "Run `/repack-init` to scaffold the actual host + remote topology before any feature work that should live in a remote." This bolt does exactly that, scaffolding:

- **Host** = the existing root app (`App.tsx`, `index.js`, `rspack.config.mjs` become the host's entry/config). Per `system-context.md §4`, the host owns: `auth`, `profile`, `predictions`, the notifications permission/token-registration logic, plus everything in `domain/`, `platform/`, and `shared/`.
- **One example remote scaffolded now** to prove the topology end-to-end, rather than scaffolding all six eventual remotes (`pools`, `competition`, `scoring-rankings`, `notifications`-preferences, `education`, `admin`) before any of them has real content. Proposal: scaffold `src/remotes/education/` as the example — `unit-09-education` is the lowest-risk, most self-contained remote (`bolt-plan.md` Bolt 11), so its scaffold doubles as a low-stakes rehearsal of "a remote loads, mounts, and falls back gracefully if it can't download." Each later remote-owning bolt (7, 5, 9 for real content, 8/10/12) repeats this same registration pattern, not a new one.
- **Shared singletons** (Module Federation `shared` config, version-pinned per `system-architecture.md`'s rule): `react`, `react-native`, the chosen navigation library, the chosen state library, and — once Bolt 4 exists — `scoring`. `domain/` and `platform/` are **not** federation-shared modules; they are bundled directly into the host (and into any remote that needs them, via a normal import) since they're small, pure, and changing them is a host-bundle-only redeploy concern, not a remote-versioning concern.
- **Graceful fallback**: per `system-architecture.md`'s rule ("always design a graceful fallback when a remote fails to download"), the host's remote-mounting wrapper renders a defined fallback (retry affordance + a non-blocking error state) rather than crashing — this is scaffolded now as a reusable `<RemoteBoundary>`-style component in `src/host/`, used by every later remote.

## 3. State management & navigation — proposal for the ADR stage

`requirements.md §8` deferred these explicitly to Construction. Proposing now, to be formally recorded (or amended) in the ADR stage next:

| Concern | Proposal | Why |
|---|---|---|
| **Navigation** | React Navigation, native-stack navigators | `coding-standards.md` mandates native navigators over JS-driven ones; React Navigation's native-stack satisfies that, has first-class TypeScript support, and is the de facto RN standard — lowest integration risk with Re.Pack/Module Federation (works as a shared singleton like any other library). |
| **Server/remote state** (predictions, pools, rankings — all backend-API-sourced reads with explicit cache-invalidation triggers already enumerated per unit, e.g. RANKINGS-4) | TanStack Query (React Query) | The unit briefs already describe exactly the shape TanStack Query is built for: cache keys, explicit invalidation triggers (membership change, match scored, override), and a clean seam to plug `BackendApiClient` calls behind `useQuery`/`useMutation`. |
| **Local/global client state** (auth session mirror, onboarding wizard step, UI-only state not backed by the backend) | Zustand | Minimal boilerplate, plays well as a Module Federation shared singleton, no provider-tree ceremony that would complicate host/remote composition. |

Both are widely-adopted, well-typed, and have no known incompatibility with Re.Pack/Module Federation's singleton-sharing model — the main ADR risk to flag is **version pinning discipline** (`system-architecture.md`'s "version skew" rule): host and every remote must resolve the exact same instance, enforced via the `shared` config from §2.

## 4. Data flow (how a feature module reaches the two adapters)

```
Screen / hook (host or remote)
   │
   ├─ useQuery/useMutation (TanStack Query) ──▶ BackendApiClient.request({ capability, body })
   │                                                  │
   │                                                  ▼
   │                                          (transport TBD — backend hosting location
   │                                           is out of this repo's authority, per
   │                                           system-context.md §3)
   │
   └─ Zustand store (auth session mirror) ◀── SupabaseAdapter.onSessionChange(...)
                                                      │
                                                      ▼
                                            Supabase JS/RN SDK
                                            (session persisted via
                                             keychain-session-storage.ts)
```

No feature module imports the Supabase SDK or constructs a request URL directly — both seams from `model.md` are the only doors in or out, matching `requirements.md §7.2`'s NFR.

## 5. `scoring` packaging mechanism — proposal for the ADR stage

`requirements.md §7.4`/`§8` left open: Module Federation shared singleton vs. an internal workspace package. Proposing: **a plain folder under `src/shared/scoring/`, registered as a Module Federation shared singleton** — not a separate npm workspace package. Rationale: this repo has no monorepo/workspace tooling configured today (single `package.json`, no `workspaces` field), and Module Federation's `shared` mechanism already guarantees a single runtime instance across host and every remote without needing a second package boundary. Introducing real npm workspaces purely to host one pure-logic module would be infrastructure overhead with no behavioral benefit here. If the repo grows enough federated/shared code later to justify true workspaces, that's a future ADR, not a Bolt 0 commitment.

## 6. Native-module placement check (`system-architecture.md` rule: "a feature requiring native modules cannot be a pure-JS remote")

This bolt's only native module is `react-native-keychain`, used exclusively inside `platform/supabase/keychain-session-storage.ts`, which lives in the **host** bundle (per §1/§2) — not in any remote. No conflict with the rule. Flagging forward: `unit-02-profile` (avatar picker, `react-native-image-picker`) and `unit-01-auth` (TOTP QR, `react-native-svg`) are both **host**-placed units already (per `requirements.md §7.4`), so this rule stays satisfied as those bolts land too — no remote in the current topology plan carries a native-module dependency that would force a re-placement.

## Checkpoint

Pausing here for approval before the ADR stage, which will formally record: (a) the folder-structure/layering rule, (b) the host + one-example-remote Module Federation scaffold, (c) React Navigation as the navigation library, (d) TanStack Query + Zustand as the state-management pairing, (e) `scoring`'s packaging mechanism, (f) the `@/*` path alias.
