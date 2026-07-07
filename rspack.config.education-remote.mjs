// Re.Pack — `education` REMOTE config (Module Federation v2).
// Adapted from this plugin's `/repack-init` template
// (templates/repack/rspack.config.remote.mjs — see ADR-002).
//
// Bolt 0 scaffolded this remote as a near-empty shell to prove the
// host→remote wiring works end-to-end. Bolt 12 (ADR-052) gives it its first
// real content (EDU-1..EDU-4) — see
// src/remotes/education/EducationRemoteEntry.tsx. This is also the first
// time this specific remote config gets a real `tamagui`/`i18next` retrofit
// (mirroring `rspack.config.pools-remote.mjs`'s Bolt-9 retrofit, ADR-043)
// plus a genuinely new MF-shared-singleton entry, `@react-native-async-
// storage/async-storage` (ADR-056 — unproven until this bolt's build probe).
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
    entry: './src/remotes/education/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // See the matching comment + src/shared/shims/react-dom-native.ts in
        // rspack.config.mjs (the host) — Tamagui's `@tamagui/popper`/
        // `@tamagui/floating` unconditionally `require('react-dom')` even on
        // native. This remote hits it for the first time now that it
        // consumes Tamagui for real (ADR-052) — same fix as `pools`' config.
        'react-dom': path.resolve(__dirname, 'src/shared/shims/react-dom-native.ts'),
      },
    },
    output: {
      path: '[context]/build/education/[platform]',
      uniqueName: 'education',
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
          { include: /.*/, type: 'remote', outputPath: `build/education/${platform}/output-remote` },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'education',
        filename: 'education.container.js.bundle',
        exposes: {
          // The host imports this via: const X = lazy(() => import('education/App'))
          './App': './src/remotes/education/EducationRemoteEntry',
        },
        dts: false,
        // Remote shares singletons NON-eager — it reuses the host's copy (ADR-002).
        shared: sharedDeps(pkg, { eager: false }),
      }),
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
    ],
  };
});

// Keep this list in sync with rspack.config.mjs (the host) — see ADR-002.
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
    // Bolt 12 (ADR-052) — this remote's first real screen
    // (`EducationRemoteEntry`) consumes both directly; must resolve to the
    // host's one Tamagui theme/context instance and one i18next instance,
    // same risk class as `pools`' equivalent entries (ADR-043).
    tamagui: dep('tamagui'),
    i18next: dep('i18next'),
    'react-i18next': dep('react-i18next'),
    // Bolt 12 (ADR-056) — the FIRST time any Module Federation *remote* (not
    // just the host) consumes `AsyncStorage` (EDU-4's dismissible-cue
    // storage, `src/platform/education/cue-store.ts`). `singleton: true`
    // (via `dep()`) is what makes this safe — without it, this remote would
    // register its own separate native module binding instead of resolving
    // to the host's already-initialized one, the same double-registration
    // risk class as the `react-native-svg` incident (Bolt 8).
    '@react-native-async-storage/async-storage': dep('@react-native-async-storage/async-storage'),
  };
}
