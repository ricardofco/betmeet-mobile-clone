// Re.Pack — HOST app config (Module Federation v2).
// Adapted from this plugin's `/repack-init` template
// (templates/repack/rspack.config.host.mjs — see ADR-002).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  };
}
