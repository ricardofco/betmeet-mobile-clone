# Tech Stack

> Read by every AI-DLC agent before acting. Keep current.

## Core
- **Framework:** React Native 0.86.0 (New Architecture enabled — `newArchEnabled=true` in `android/gradle.properties`).
- **Bundler:** **Re.Pack** 5.2.5 (`@callstack/repack`) on **Rspack** 1.7.8 — configured in `rspack.config.mjs`. **NOT Metro.** Do not generate Metro-specific config.
  - ⚠️ `metro.config.js` still exists in the repo (RN CLI default scaffold). It is not the active bundler; treat it as legacy and prefer removing it via `/repack-init` cleanup rather than maintaining it.
- **Code splitting / microfrontends:** Module Federation v2 — **not yet configured**. `rspack.config.mjs` currently only wires `Repack.RepackPlugin()` with no host/remote split. Run `/repack-init` to scaffold the actual host + remote topology.
- **JS engine:** Hermes (default for RN 0.86, bytecode chunks, tree-shaking enabled).
- **Language:** TypeScript 5.8 (strict mode via `@react-native/typescript-config`).
- **React:** 19.2.3.

## Conventions
- Lists: **FlashList** (not FlatList) for any scrolling collection. *(Not yet a dependency — add when the first scrolling list is built.)*
- Navigation: native-stack / native navigators (not JS-only stacks). *(No navigation library installed yet.)*
- State: <fill in once chosen — e.g. Zustand / Redux Toolkit / React Query>.
- Package manager: **unclear — both `yarn.lock` and `package-lock.json` are present and untracked.** Pick one (repo convention favors Yarn given `yarn.lock` is referenced in `.gitignore` patterns) and remove the other before the first dependency change.

## Federation boundaries (fill in per project)
- Host bundle contains: <core nav, auth, shared UI — TBD, app is still the RN CLI starter screen>.
- Federated remotes: <none yet>.
- Shared singletons across chunks: react, react-native, navigation, state lib (pin versions to avoid duplication) — to be enforced once Module Federation is scaffolded.

## Performance budget
- Target FPS: 60. Time-to-interactive: <fill in> ms. Host chunk ceiling: <fill in> KB.

## Platforms
- iOS and Android scaffolded (`ios/`, `android/`). No tvOS/macOS targets present.
- iOS bundle identifier is still the RN CLI placeholder (`org.reactjs.native.example.$(PRODUCT_NAME)`) — update before any release build.
