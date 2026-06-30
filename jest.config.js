module.exports = {
  // Pre-existing scaffold gap fixed here: `@react-native/jest-preset` was
  // referenced but never installed as a devDependency — `react-native`'s own
  // `jest-preset.js` now just points here with a migration error. This
  // blocked `yarn test` entirely before this bolt (see ADR note in
  // memory-bank/bolts/bolt-0-platform-scaffolding/).
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
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
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler|react-native-screens|react-native-url-polyfill|react-native-keychain|react-native-svg|react-native-qrcode-svg)',
  ],
};
