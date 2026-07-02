module.exports = {
  root: true,
  extends: '@react-native',
  // `vendor/` is bundled Ruby-gem assets (not project source); `build/` is
  // Module Federation's Re.Pack output (ADR-002). `rspack.config*.mjs` files
  // use import attributes (`with { type: 'json' }`, ES2025) that Node/Rspack
  // parse fine but this config has no `.mjs` override for (only *.js/*.ts
  // overrides exist below) — falls back to the default espree parser, which
  // chokes on that syntax. `yarn lint`'s CLI never actually reached these
  // files anyway (ESLint 8's default --ext doesn't include .mjs), so this
  // only silences IDE-only false positives, not a real regression. `backend/`
  // is a separate Node project with its own tsconfig/tooling — not this
  // app's ESLint concern.
  ignorePatterns: ['vendor/', 'build/', 'rspack.config*.mjs', 'backend/'],
};
