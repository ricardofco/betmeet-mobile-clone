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
  setupFiles: [
    require.resolve('@react-native/jest-preset/jest/setup.js'),
    require.resolve('react-native-gesture-handler/jestSetup.js'),
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
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler|react-native-screens|react-native-url-polyfill|react-native-keychain|react-native-svg|react-native-qrcode-svg|react-native-image-picker|@react-native-async-storage|@shopify/flash-list)',
  ],
};
