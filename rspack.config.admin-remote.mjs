// Re.Pack — `admin` REMOTE config (Module Federation v2).
// Adapted from rspack.config.pools-remote.mjs (ADR-002's template, same
// structure) — the repo's THIRD real MF remote (ADR-057), and the first one
// to introduce ZERO net-new MF-singleton categories: every shared dep this
// remote needs (`tamagui`/`i18next`+`react-i18next`/`@tanstack/react-query`/
// `@shopify/flash-list`, plus the `react-dom` shim) has already been proven
// safe on a real device build at least once by `pools`/`education`.
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
    entry: './src/remotes/admin/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // See the matching comment + src/shared/shims/react-dom-native.ts in
        // rspack.config.mjs (the host) — same unconditional Tamagui import.
        'react-dom': path.resolve(__dirname, 'src/shared/shims/react-dom-native.ts'),
      },
    },
    output: {
      path: '[context]/build/admin/[platform]',
      uniqueName: 'admin',
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
          { include: /.*/, type: 'remote', outputPath: `build/admin/${platform}/output-remote` },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'admin',
        filename: 'admin.container.js.bundle',
        exposes: {
          // The host imports this via: const X = lazy(() => import('admin/App'))
          './App': './src/remotes/admin/AdminRemoteEntry',
        },
        dts: false,
        // Remote shares singletons NON-eager — it reuses the host's copy (ADR-002).
        shared: sharedDeps(pkg, { eager: false }),
      }),
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
    ],
  };
});

// Keep this list in sync with rspack.config.mjs (the host) AND
// rspack.config.pools-remote.mjs (ADR-002/ADR-034/ADR-057). Every entry
// below already appears in `pools`' own shared list — no new singleton
// category is introduced by this remote (ADR-057's Consequences).
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
    // This remote's own screens (`AdminHomeScreen`, `SweepStatusScreen`,
    // `ForceResultScreen`, `RevertOverrideScreen`) consume both directly;
    // must resolve to the host's one Tamagui theme/context instance and one
    // i18next instance, same risk class as `pools`/`education`'s equivalent
    // entries (ADR-043/ADR-052).
    tamagui: dep('tamagui'),
    i18next: dep('i18next'),
    'react-i18next': dep('react-i18next'),
  };
}
