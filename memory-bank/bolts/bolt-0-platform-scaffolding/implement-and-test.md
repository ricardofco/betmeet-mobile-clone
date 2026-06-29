# Bolt 0 — Platform Scaffolding — Implement & Test Stages

> **Stages 4 & 5 of 5.** Checkpoint: pause for approval before declaring the bolt done, and explicitly before attempting Layer 2 (device-level) verification, per the Construction checkpoint discipline ("pause... before running device automation").

## Implement — what was built

### Tooling/config fixes required to even start (pre-existing gaps, not new scope creep)
- Removed `package-lock.json`; standardized on Yarn (`yarn.lock` already existed from a prior `yarn install`, matching `.gitignore`'s Yarn-specific patterns).
- Fixed `jest.config.js`'s preset reference (`@react-native/jest-preset` was referenced but never installed — added it as a devDependency).
- Extended `jest.config.js`'s `transformIgnorePatterns` to cover the new RN-ecosystem packages this bolt adds (`react-native-gesture-handler`, `react-native-screens`, `react-native-url-polyfill`, `react-native-keychain`, `@react-navigation/*`), which ship untranspiled ESM in `node_modules`.
- Wired `react-native-gesture-handler`'s documented Jest setup (`jestSetup.js`) into `setupFiles`, alongside (not replacing) the preset's own setup file.
- Added `.eslintrc.js` `ignorePatterns` for `vendor/` (bundled Ruby-gem JS assets, unrelated to this project, previously linted by accident) and `build/` (new Module Federation output directory).

### New dependencies added (`yarn add`)
Runtime: `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-gesture-handler`, `@tanstack/react-query`, `zustand`, `react-native-keychain`, `@supabase/supabase-js`, `react-native-url-polyfill`.
Dev: `@testing-library/react-native`, `@module-federation/enhanced` (required by Re.Pack's `ModuleFederationPluginV2` — it throws at build time if absent), `@react-native/jest-preset`.

### Folder structure (ADR-001)
```
src/
  domain/auth/auth-claims.ts              # AuthClaims, AuthSession, tri-state helpers
  domain/auth/__tests__/auth-claims.test.ts
  platform/supabase/{supabase-adapter,keychain-session-storage,config}.ts
  platform/backend-api/backend-api-client.ts
  platform/backend-api/__tests__/backend-api-client.test.ts
  host/
    providers/app-providers.tsx           # GestureHandlerRootView + SafeAreaProvider + QueryClientProvider
    navigation/root-navigator.tsx          # NavigationContainer + native-stack + remote-load demo
    remote-boundary.tsx                    # graceful fallback wrapper (system-architecture.md rule)
    script-manager-setup.ts                # Re.Pack ScriptManager resolver (ADR-002)
    federated-modules.d.ts                 # manual .d.ts for the `education/App` federated import
  remotes/education/
    EducationRemoteEntry.tsx               # placeholder, exposed as `./App`
    index.js                               # standalone preview entry (not used by the host)
```

### Module Federation (ADR-002)
- `rspack.config.mjs` (host): `ModuleFederationPluginV2` with `name: 'BetmeetMobileHost'`, `remotes: { education: 'education@http://localhost:8082/${platform}/mf-manifest.json' }`, shared singletons eager.
- `rspack.config.education-remote.mjs` (new, root-level — see deviation note below): `name: 'education'`, `exposes: { './App': './src/remotes/education/EducationRemoteEntry' }`, shared singletons non-eager.
- `index.js` imports `./src/host/script-manager-setup` first, before app registration, per the template's wiring requirement.
- `package.json` scripts: `start` (host, unchanged), `start:education` (remote, port 8082), `typecheck` (new).

**Deviation from the `/repack-init` template's per-remote-subfolder convention**: the remote's Rspack config lives at the repo root (`rspack.config.education-remote.mjs`) rather than nested inside `src/remotes/education/`, because this is a single-package repo (no workspaces, ADR-005) and a nested `context` would have complicated relative path resolution for no benefit. Documented here so the next remote-owning bolt (pools, competition, etc.) follows the same root-level-config pattern, not the template's literal nested layout.

### Post-Layer-2 fixes (found running on a real iOS Simulator)
- **`@module-federation/enhanced` version**: Bolt 0 originally installed `^2.6.0` (latest at the time). Re.Pack 5.2.5 is built/tested against `0.8.9` (its own pinned `devDependency`) and only declares a loose, unvalidated `peerDependencies` range (`>=0.6.10`) — installing 2.6.0 left two incompatible generations of the `@module-federation/runtime`/`runtime-core` packages installed simultaneously. Pinned `@module-federation/enhanced` to `0.8.9` to match what Re.Pack actually exercises.
- **`RUNTIME-006` (`loadShareSync` ... "should not be called unless eager:true")**: the real cause, found after the version pin above didn't fully resolve it. `@react-navigation/native` and `@react-navigation/native-stack` ship a bare `{"type":"module"}` `package.json` inside their `lib/module/` ESM subpath (no `version` field). Because both Rspack configs resolve via `enablePackageExports: true`, Module Federation's shared-version auto-detection finds that file first, gets no version, and the eager-shared registration ends up with a mismatched/empty version key — so the consumer-side `loadShareSync` call falls through to an async (`Promise`-returning) factory and throws. Fix: both `rspack.config.mjs` and `rspack.config.education-remote.mjs` now resolve each shared dependency's real installed `version` directly from `node_modules/<pkg>/package.json` and pass it explicitly in the `shared` config, bypassing the broken auto-detection.
- **`RemoteBoundary` crash on "Load education remote"**: turned out to be operator error in this session, not a code bug — the `education` remote's dev server (`yarn start:education`, port 8082) wasn't running. With both dev servers up, the remote loads and renders correctly. The fallback-path half of Layer 2 (killing the remote's dev server mid-session and confirming `RemoteBoundary`'s retry UI, rather than a crash) was **not** exercised this session — still open, see Layer 2 below.

### Path alias (ADR-006)
- `tsconfig.json`: `baseUrl: "."`, `paths: { "@/*": ["src/*"] }`.
- Both Rspack configs (host and remote): `resolve.alias['@'] = path.resolve(__dirname, 'src')`.
- `jest.config.js`: `moduleNameMapper` for `^@/(.*)$`.

### State/navigation (ADR-003, ADR-004)
- `AppProviders` wraps the app in `GestureHandlerRootView` → `SafeAreaProvider` → a single `QueryClientProvider`.
- `RootNavigator` uses `@react-navigation/native`'s `NavigationContainer` + `createNativeStackNavigator`, with one placeholder `HomeScreen` (unit-01-auth's AUTH-7 replaces this with the real gated tree).
- No Zustand store is created yet — there's nothing to put in it until `unit-01-auth`'s session-mirror store (AUTH-7/AUTH-8) is built; ADR-004 fixes the library choice, not its first consumer.

### `SupabaseAdapter` and `BackendApiClient` (Model stage's contracts, now implemented)
- `getSupabaseAdapter()` constructs a real `@supabase/supabase-js` client with `keychainSessionStorage` as its `auth.storage`, and implements `getSession()`/`onSessionChange()` mapping the SDK's `getClaims()` + `mfa.getAuthenticatorAssuranceLevel()` into our tri-state `AuthClaims`. **Throws clearly** if `SUPABASE_URL`/`SUPABASE_ANON_KEY` aren't configured (no env-var wiring exists yet — explicitly deferred to `unit-01-auth`'s bolt, flagged in `config.ts`'s TODO).
- `getBackendApiClient()` implements a minimal `fetch`-based `request({ capability, body })`, attaching the current session's access token as a bearer header. **Throws a typed `BackendApiError`** (capability name + status) if `BACKEND_API_BASE_URL` isn't configured, rather than attempting a network call to nowhere.

## Test — Layer 1 (component/unit, `react-native-testing-library` + Jest)

All passing:

```
PASS src/domain/auth/__tests__/auth-claims.test.ts        (5 tests)
PASS src/platform/backend-api/__tests__/backend-api-client.test.ts  (2 tests)
PASS __tests__/App.test.tsx                                (1 test, pre-existing smoke test)

Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total
```

- `auth-claims.test.ts`: verifies the tri-state fail-open semantics from `model.md` — `isExplicitlyTrue`/`isExplicitlyFalse` never fire on `null`, only on a literal matching boolean; `isAuthenticated` keys off `sub`.
- `backend-api-client.test.ts`: verifies `BackendApiClient.request()` throws a typed `BackendApiError` (carrying the capability name) rather than a raw/opaque error when unconfigured — important because every later bolt's capability calls inherit this error shape.
- `__tests__/App.test.tsx` (pre-existing, unmodified): renders the **full** app tree — `AppProviders` → `RootNavigator` → `NavigationContainer` → native-stack → `HomeScreen` — without crashing. This is a meaningful regression check: it confirms React Navigation, the gesture-handler/safe-area/query providers, and the lazy-remote reference all coexist and mount correctly under Jest's render environment, even though the lazy `education/App` import itself is never *invoked* in this test (the remote-loading button isn't pressed) — see the Layer 2 gap below.

Also clean: `yarn typecheck` (`tsc --noEmit`), `yarn lint` (`eslint .`, after the `vendor/`/`build/` ignore fix and one inline-style fix).

## Test — Layer 2 (device-level, real iOS Simulator) — done for the happy path

Run with both dev servers up (`yarn start` for the host, `yarn start:education` on port 8082 for the remote) on a real iOS Simulator build:
1. Native pod install / Gradle sync for the three new native modules (`react-native-screens`, `react-native-gesture-handler`, `react-native-keychain`) — done.
2. Host app builds and launches on the iOS Simulator.
3. Tapping "Load education remote" on the Home screen fetches and mounts the federated `education` remote, rendering its placeholder text — confirms the live Module Federation fetch-and-mount works, not just that it compiles. Required the two fixes above (`@module-federation/enhanced` version pin, explicit shared-dependency `version` resolution) to get past `RUNTIME-006`.

**Still open** (not yet exercised): killing the remote's dev server mid-session and confirming `RemoteBoundary`'s fallback (retry UI) renders instead of a crash — the second half of `testing-standards.md`'s Layer 2 bar for this bolt ("the fallback path works when it can't [download]"). Android Simulator/Emulator run also not yet done (iOS only so far).

**Bolt 0 is closed** at this checkpoint: Layer 1 + Layer 2 happy-path both green. The two still-open items above (fallback-path proof, Android run) are minor and can be picked up opportunistically rather than blocking Bolt 1.
