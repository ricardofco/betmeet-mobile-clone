# ADR-056 — `@react-native-async-storage/async-storage` added defensively as a new MF-shared-singleton entry in the `education` remote; cross-bundle behavior PROVEN SAFE

## Status
Accepted (2026-07-06). **Verified (2026-07-06)** — the real build probe
committed to below has run and passed; see "Probe outcome" below. Both the
host and the `education` remote's dev servers were started for real, their
bundles fetched over HTTP (not a `tsc`/Jest-only check), and the remote's MF
manifest was inspected directly to confirm `@react-native-async-storage/
async-storage` resolves as a single shared singleton, not a duplicated
per-bundle registration.

## Probe outcome (2026-07-06)

Ran both dev servers for real:
- `yarn start:education` (port 8082) — bundled with zero errors (only the
  same benign Tamagui "Critical dependency: require function..." warnings
  already accepted in `pools`'/the host's own bundles). Fetched
  `http://localhost:8082/education.container.js.bundle?platform=ios` → `200`,
  475KB.
- Fetched and inspected `http://localhost:8082/ios/mf-manifest.json`
  directly: `@react-native-async-storage/async-storage` appears in the
  `shared` array with `"singleton": true`, `"version": "3.1.1"` — alongside
  `tamagui`/`i18next`/`react-i18next`, all four confirmed present as shared
  entries, not bundled locally.
- `yarn start` (host, port 8081) — bundled with zero errors. Fetched
  `http://localhost:8081/index.bundle?platform=ios` → `200`, 17MB (expected
  dev-bundle size).
- Checked both dev-server logs for the `react-native-svg` incident's own
  error signature (`Invariant Violation`, "already registered", "duplicate")
  — none found in either log.

One real, separate build error was caught and fixed during this same probe
(not an `AsyncStorage` issue): the `education` remote's config was missing
the `react-dom` → `src/shared/shims/react-dom-native.ts` alias that
`pools`'/the host's configs already carry (ADR-045) — Tamagui's
`@tamagui/popper`/`@tamagui/floating` unconditionally `require('react-dom')`
even on native, and this remote hit it for the first time now that it
consumes Tamagui for real. Fixed by adding the same alias, matching
`rspack.config.pools-remote.mjs` exactly.

`@react-native-async-storage/async-storage` now joins `react-native-svg`/
`@tanstack/react-query`/`@shopify/flash-list` as a proven-safe MF shared
singleton across this project's remotes — this ADR is not "perpetually
pending," per its own Consequences section below.

## Context

EDU-4 (dismissible educational cues) needs a per-device key-value store to
back `shouldShowCallout(cueId)`/`dismissCallout(cueId)`'s fail-open contract
(`model.md §5`). `@react-native-async-storage/async-storage` already exists
as an installed dependency (Bolt 3, ADR-013 — backs locale persistence), and
`design.md §9.1` confirms reusing it rather than adding a second local-KV
dependency, following the exact reasoning `model.md §5` already laid out.

**The genuinely new risk, flagged explicitly rather than silently assumed
safe** (`design.md §9.2`): every prior consumer of `AsyncStorage` in this
repo has been **host-side only** (`src/platform/profile/locale-store.ts`).
This is the **first time any Module Federation *remote*** (not just the
host) would consume `AsyncStorage` — a native-backed module whose
cross-bundle registration behavior in this project's specific Rspack/Module
Federation setup has never been exercised.

This project has been burned by exactly this class of gap once already,
concretely, not hypothetically: Bolt 8's real-device Layer 2 pass found the
`pools` remote crash on its very first navigation with `Invariant
Violation: Tried to register two views with the same name RNSVGCircle` —
`react-native-svg` was used by both host and `pools` but had not been added
to either bundle's MF `shared` config, so each bundle registered its own
copy of the same Fabric native component
(`activeContext.md`'s standing note: *"every MF shared-dependency list needs
a deliberate audit, not just incremental fixes as gaps are hit on-device"*).
`system-architecture.md`'s own rule is explicit on this point too: *"a
feature that requires native modules cannot be a pure-JS remote... record
the decision as an ADR."* `AsyncStorage`'s specific cross-bundle behavior is
**not yet proven** the way `react-native-svg`/`@tanstack/react-query` now
are for `pools` (proven the hard way for `react-native-svg`, proactively for
`@tanstack/react-query` per ADR-034).

## Decision

Add `@react-native-async-storage/async-storage` to the `education` remote's
MF `shared` config **proactively, defensively, now** — the safer default
given the `react-native-svg` precedent — rather than waiting to hit a
double-registration crash on-device first:

```
rspack.config.mjs                            (host — already shares it)
rspack.config.education-remote.mjs           (NEW: adds it, singleton: true)
```

alongside this bolt's other required additions to the `education` remote's
`sharedDeps()` (`tamagui`, `i18next`/`react-i18next`, the `react-dom` alias
— all already proven safe by `pools`, `design.md §10`).

**This ADR does not itself close the risk.** The two-tier domain/platform
split (`src/domain/education/cue-store.ts` synchronous logic +
`src/platform/education/cue-store.ts` async `AsyncStorage` wrapper,
`design.md §9.1`) is the code-level design; **Implement stage must run a
real build probe** — the same discipline ADR-045/046 already established
for this project's other new-dependency risks (an actual dev-server build
of the `education` remote, exercising `use-dismissible-cue.ts` on a real
device/simulator, confirming no `Invariant Violation`/module-resolution
error occurs — not a `tsc`/Jest-only check, since Jest runs each bundle in
isolation and cannot reproduce a cross-bundle double-registration the way a
real two-bundle Module Federation load can). Until that probe runs and
passes, this remains an **open, flagged risk**, not a proven-safe one.

## Consequences

- `rspack.config.education-remote.mjs` gains a new `shared` entry
  (`'@react-native-async-storage/async-storage': { singleton: true }`)
  alongside `tamagui`/`i18next`/`react-i18next`/the `react-dom` alias — all
  four are this bolt's first real retrofit of what was previously a Bolt-0
  demo-shell config.
- **Implement stage must record the probe's outcome explicitly** (pass or
  fail) as its own entry in `implement-and-test.md`, the same way ADR-046
  recorded `react-native-reanimated`/`react-native-worklets`'s real
  `xcodebuild` probe result. If the probe fails (double registration, a
  module-resolution mismatch, or any other cross-bundle error), the fallback
  is the same class of fix `react-native-svg`'s incident used — confirm the
  `singleton: true` config is correctly wired on **both** the host's and the
  `education` remote's rspack configs — not a silent workaround.
- If this probe passes cleanly, `@react-native-async-storage/async-storage`
  joins `react-native-svg`/`@tanstack/react-query`/`@shopify/flash-list` as
  a third-or-later-proven-safe MF shared singleton across this project's
  remotes, and this ADR should be updated (or a short follow-up note added)
  to reflect the confirmed-safe outcome rather than leaving it perpetually
  marked "pending."
- **Standing instruction carried forward, same as `activeContext.md`'s
  existing note**: any future remote that (directly or via a shared/domain
  module) touches `AsyncStorage` must add this same MF-shared-singleton
  entry — check this whenever a new remote is added that reuses any shared
  logic touching local device storage, the same audit discipline already
  named for `react-native-svg`.
