module.exports = {
  // Pre-existing scaffold gap fixed here: `@react-native/jest-preset` was
  // referenced but never installed as a devDependency — `react-native`'s own
  // `jest-preset.js` now just points here with a migration error. This
  // blocked `yarn test` entirely before this bolt (see ADR note in
  // memory-bank/bolts/bolt-0-platform-scaffolding/).
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Bolt 3 (ADR-013): redirects every import of the real package to its
    // own ships-with-the-package Jest mock (an in-memory store) — this
    // package's mock is a `moduleNameMapper` substitution target, not a
    // `setupFiles` side-effecting shim like react-native-gesture-handler's.
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest',
  },
  // Augments (not replaces) the preset's own setupFiles — required so
  // react-native-gesture-handler's native module is mocked under Jest
  // (its own documented setup step), per ADR-002/ADR-003.
  //
  // Bolt 9 (ADR-045): also forces `tamagui.config.ts`'s `createTamagui()` to
  // run once per test process — Tamagui's `getConfig()` throws ("Missing
  // tamagui config") if no config was ever registered, which no individual
  // component test triggers on its own (they don't each wrap in
  // `<TamaguiProvider>`). `react-native-reanimated` is NOT redirected via
  // `moduleNameMapper` here (the package's own shipped `.../mock` re-enters
  // real native-init code and crashes under Jest, see `__mocks__/react-
  // native-reanimated.js`'s header comment) — a hand-written `__mocks__`
  // file is used instead, auto-applied by Jest for node_modules packages
  // without needing an explicit mapper entry (same mechanism already
  // covering `react-native-qrcode-svg`/`react-native-image-picker`/
  // `react-dom` below).
  setupFiles: [
    require.resolve('@react-native/jest-preset/jest/setup.js'),
    require.resolve('react-native-gesture-handler/jestSetup.js'),
    require.resolve('./tamagui.config.ts'),
  ],
  // The default preset's transformIgnorePatterns only un-ignores react-native
  // and @react-native(-community) packages. Bolt 0 adds several RN-ecosystem
  // packages that ship untranspiled ESM in node_modules (ADR-002/ADR-003) —
  // extend the allowlist or their imports fail to parse under Jest.
  // Bolt 2: react-native-svg and react-native-qrcode-svg added (ADR-007).
  // react-native-qrcode-svg is mocked via __mocks__ to avoid native SVG
  // rendering in Jest; react-native-svg is listed here for completeness.
  // Bolt 3: react-native-image-picker added (design.md §7), mocked via
  // __mocks__ (same pattern as react-native-qrcode-svg, ADR-007) — native
  // camera/library UI isn't available under Jest.
  // @react-native-async-storage/async-storage added (ADR-013) — its own
  // Jest mock (wired above) makes adding it to this allowlist unnecessary
  // for the mocked import path, but it's listed for completeness in case
  // any transitive import bypasses the mock.
  // Bolt 5: @shopify/flash-list added (ADR-022) — its `dist/index.js` ships
  // untranspiled ESM `import` syntax despite no `"type": "module"` in its
  // package.json, same class of gap as the packages above.
  // Bolt 9 (ADR-042/043/044/046): `@react-navigation/bottom-tabs`/`drawer`
  // (already covered by the `@react-navigation` prefix), their transitive
  // `react-native-drawer-layout`/`react-native-is-edge-to-edge` deps,
  // `react-native-worklets` (reanimated v4's separate worklet-runtime
  // package), `tamagui`/`@tamagui/*`, and `i18next`/`react-i18next` — all
  // ship untranspiled ESM in node_modules, same class of gap as above.
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler|react-native-screens|react-native-url-polyfill|react-native-keychain|react-native-svg|react-native-qrcode-svg|react-native-image-picker|@react-native-async-storage|@shopify/flash-list|react-native-drawer-layout|react-native-is-edge-to-edge|react-native-worklets|react-native-reanimated|@tamagui|tamagui|i18next|react-i18next)',
  ],
};
