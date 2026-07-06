// Re.Pack — HOST app config (Module Federation v2).
// Adapted from this plugin's `/repack-init` template
// (templates/repack/rspack.config.host.mjs — see ADR-002).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Some dual ESM/CJS packages (e.g. @react-navigation/*) ship a bare
// `{"type":"module"}` package.json inside their `lib/module/` ESM subpath.
// When `enablePackageExports` resolves a shared dep to that subpath, MF's
// version auto-detection finds that file first and gives up (no `version`
// field), which leaves the shared module's registered version empty and
// breaks the eager-consume match at runtime (RUNTIME-006). Resolving the
// real installed version explicitly here sidesteps the auto-detection.
function installedVersion(name) {
  return JSON.parse(readFileSync(path.resolve(__dirname, 'node_modules', name, 'package.json'), 'utf8')).version;
}

export default Repack.defineRspackConfig((env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // ADR-045 follow-up — see src/shared/shims/react-dom-native.ts.
        // `IgnorePlugin` turned this into a throw-on-access stub, which
        // crashed at boot because `@tamagui/popper`'s `import { flushSync }
        // from "react-dom"` is unconditional. Alias to a real shim instead.
        'react-dom': path.resolve(__dirname, 'src/shared/shims/react-dom-native.ts'),
      },
    },
    output: {
      path: '[context]/build/host/[platform]',
      uniqueName: 'BetmeetMobileHost',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          // Post-Implement fix (2026-07-06, Layer 2 finding #1's follow-up):
          // `lucide-react-native` is excluded from our own `babel-swc-loader`
          // rule. Root cause, confirmed via a real dev-server build (a
          // static `npx react-native bundle` run did NOT catch this — same
          // "build success != runtime/full-compile success" lesson as
          // ADR-045's `react-dom` incident): this loader's underlying
          // parser is Hermes' own (`hermes-parser`), which rejects
          // `lucide-react-native/dist/esm/icons/infinity.mjs`'s
          // `const Infinity = createLucideIcon(...)` as "can't create
          // duplicate variable that shadows a global property" — valid,
          // ordinary JS that Hermes' parser alone is strict about.
          // Disabling `ReanimatedPlugin`'s OWN separate module-rule
          // injection (`unstable_disableTransform: true`, below) did NOT
          // fix this — the error persisted through *this* project rule,
          // proving the two are independent issues. `lucide-react-native`
          // ships plain, already-valid modern JS/ESM (no JSX/TS/Flow to
          // strip), so it doesn't need this loader's transform pipeline at
          // all; Rspack's own native module handling parses it directly.
          exclude: /node_modules[\\/]lucide-react-native/,
          type: 'javascript/auto',
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
        },
        ...Repack.getAssetTransformRules(),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          { include: /.*/, type: 'remote', outputPath: `build/host/${platform}/output-remote` },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'BetmeetMobileHost',
        filename: 'BetmeetMobileHost.container.js.bundle',
        // Remotes are resolved at runtime via ScriptManager (src/host/script-manager-setup.ts).
        // Swap localhost for a CDN URL in production — see SETUP notes in
        // memory-bank/bolts/bolt-0-platform-scaffolding/.
        remotes: {
          education: `education@http://localhost:8082/${platform}/mf-manifest.json`,
          // Bolt 7 (ADR-032) — the second real MF remote (first feature remote,
          // not a demo shell).
          pools: `pools@http://localhost:8083/${platform}/mf-manifest.json`,
        },
        dts: false,
        // Host shares its singletons EAGER so they load with the host bundle (ADR-002).
        shared: sharedDeps(pkg, { eager: true }),
      }),
      // @react-navigation/elements optionally requires this; ignored if unused.
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
      // Bolt 9 (ADR-046) — react-native-reanimated is a peer dep of
      // @react-navigation/drawer. The actual worklets transform already runs
      // via babel.config.js's global `react-native-worklets/plugin`.
      // `unstable_disableTransform: true` is required (not just a nicety) —
      // ADR-045's "Post-Implement addition" originally assumed this
      // plugin's own module-rule injection was a no-op on the
      // `babel-swc-loader` path; that assumption was wrong (or the risk was
      // latent until a specific file triggered it) — a real dev-server
      // build (Layer 2 finding #1's follow-up, adding `lucide-react-native`)
      // proved this plugin's *own* rule (which, per its source, applies to
      // literally every non-react/react-native JS/MJS file in the whole
      // dependency graph, not just reanimated-related ones) parses
      // `lucide-react-native/dist/esm/icons/infinity.mjs` through Hermes'
      // stricter parser and fails on `const Infinity = ...` ("can't create
      // duplicate variable that shadows a global property") — valid JS, a
      // Hermes-parser-specific rejection. Disabling the transform (exactly
      // what this plugin's own emitted warning recommends when paired with
      // `babel-swc-loader`) removes that broad rule entirely; the plugin is
      // still added for its benign-warning suppression only.
      new ReanimatedPlugin({ unstable_disableTransform: true }),
    ],
  };
});

// Keep this list in sync with rspack.config.education-remote.mjs AND
// rspack.config.pools-remote.mjs (ADR-002/ADR-034). Versions must match
// (singletons) to avoid duplicate React/RN across federated chunks.
// @shopify/flash-list and @tanstack/react-query were added in Bolt 7
// (ADR-034) — the `pools` remote is the first non-host consumer of both;
// `@tanstack/react-query`'s `singleton: true` is load-bearing (not just a
// bundle-size nicety) — it's what makes the remote's useQuery/useMutation
// calls resolve against the host's one QueryClient instance.
function sharedDeps(pkg, { eager }) {
  const dep = (name) => ({
    singleton: true,
    eager,
    requiredVersion: pkg.dependencies[name],
    version: installedVersion(name),
  });
  return {
    react: dep('react'),
    'react-native': dep('react-native'),
    '@react-navigation/native': dep('@react-navigation/native'),
    '@react-navigation/native-stack': dep('@react-navigation/native-stack'),
    'react-native-safe-area-context': dep('react-native-safe-area-context'),
    'react-native-screens': dep('react-native-screens'),
    '@shopify/flash-list': dep('@shopify/flash-list'),
    '@tanstack/react-query': dep('@tanstack/react-query'),
    // Bolt 8: `pools`' predictions grid pulls in `src/shared/competition`'s
    // flag/team badges, the first time that shared-code path is required
    // from a second bundle. Without `singleton: true` here, the remote
    // registers its own copy of react-native-svg's Fabric native components
    // (RNSVGCircle etc.) alongside the host's already-registered copy —
    // Fabric's native component registry is process-global, not
    // bundle-scoped, so the second registration throws
    // "Tried to register two views with the same name" and crashes the
    // remote's module evaluation before it can export `./App`.
    'react-native-svg': dep('react-native-svg'),
    // Bolt 9 (ADR-043) — host-only: the tab/drawer navigation shell is 100%
    // host code (ADR-042), no remote renders tabs/drawer itself, so these
    // are NOT added to either remote's shared config.
    '@react-navigation/bottom-tabs': dep('@react-navigation/bottom-tabs'),
    '@react-navigation/drawer': dep('@react-navigation/drawer'),
    // `@react-navigation/drawer`'s peer dependency (ADR-046) — host-only for
    // the same reason as the two rows above.
    'react-native-reanimated': dep('react-native-reanimated'),
    'react-native-worklets': dep('react-native-worklets'),
    // Only read once, at boot, by `platform/i18n/i18n.ts` — no remote calls
    // this package directly (ADR-043).
    'react-native-localize': dep('react-native-localize'),
    // Bolt 9 (ADR-043) — host AND `pools` remote singletons: `pools`' own
    // screens consume both directly (bolt-plan.md's Bolt-5-8 retrofit
    // scope), so a duplicated instance in the remote would create a second,
    // disconnected theme/translation-state context — same risk class as the
    // React-Query/react-native-svg incidents above. NOT added to the
    // `education` remote's config (not retrofitted this bolt, still Bolt 0's
    // demo shell — re-audit if a future bolt gives it real screens).
    tamagui: dep('tamagui'),
    i18next: dep('i18next'),
    'react-i18next': dep('react-i18next'),
    // Post-Implement fix (Layer 2 finding #1, new ADR-047) — tab-bar icons.
    // Host-only: only `main-tab-navigator.tsx`'s tab bar uses icons; this
    // bolt's `pools`-remote design polish (finding #4) used existing Tamagui
    // primitives, not icons, so `pool-list-item.tsx` etc. don't need this
    // package — not added to `rspack.config.pools-remote.mjs`. Unlike
    // `tamagui`/`i18next`, `lucide-react-native` has no shared-context/
    // singleton *correctness* requirement (each icon is a stateless SVG
    // render, no Provider needed) — this entry is a bundle-size nicety, not
    // a bug-avoidance one, should a future bolt add icons to `pools` too.
    'lucide-react-native': dep('lucide-react-native'),
  };
}
