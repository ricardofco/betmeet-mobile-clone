// Re.Pack — `pools` REMOTE config (Module Federation v2).
// Adapted from rspack.config.education-remote.mjs (ADR-002's template),
// same structure. This is the repo's first real FEATURE remote (not a demo
// shell) — see memory-bank/bolts/bolt-7-pools-core/adr-032-
// pools-as-second-federated-remote.md.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// See the matching comment in rspack.config.mjs (the host) — keeps the
// explicit `version` resolution for ESM dual-package shared deps in sync.
function installedVersion(name) {
  return JSON.parse(readFileSync(path.resolve(__dirname, 'node_modules', name, 'package.json'), 'utf8')).version;
}

export default Repack.defineRspackConfig((env) => {
  const { mode, context, platform } = env;

  return {
    mode,
    context,
    entry: './src/remotes/pools/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    output: {
      path: '[context]/build/pools/[platform]',
      uniqueName: 'pools',
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
          { include: /.*/, type: 'remote', outputPath: `build/pools/${platform}/output-remote` },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'pools',
        filename: 'pools.container.js.bundle',
        exposes: {
          // The host imports this via: const X = lazy(() => import('pools/App'))
          './App': './src/remotes/pools/PoolsRemoteEntry',
        },
        dts: false,
        // Remote shares singletons NON-eager — it reuses the host's copy (ADR-002).
        shared: sharedDeps(pkg, { eager: false }),
      }),
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
    ],
  };
});

// Keep this list in sync with rspack.config.mjs (the host) — see ADR-002/ADR-034.
// @shopify/flash-list and @tanstack/react-query are additive vs. the
// education remote's list (ADR-034 — first remote-side consumers of both).
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
    // Bolt 8: this remote's predictions grid reuses `src/shared/competition`'s
    // flag/team badges (react-native-svg-based) — must be a singleton or its
    // Fabric native components collide with the host's own registration.
    // See the matching comment in rspack.config.mjs.
    'react-native-svg': dep('react-native-svg'),
  };
}
