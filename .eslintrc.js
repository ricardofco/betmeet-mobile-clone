module.exports = {
  root: true,
  extends: '@react-native',
  // `vendor/` is bundled Ruby-gem assets (not project source); `build/` is
  // Module Federation's Re.Pack output (ADR-002). Neither should be linted.
  ignorePatterns: ['vendor/', 'build/'],
};
