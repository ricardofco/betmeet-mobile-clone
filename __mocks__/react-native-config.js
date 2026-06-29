// `react-native-config` ships a native module (`NativeModules.RNCConfig`)
// that doesn't exist under Jest's RN environment, so importing the real
// package throws ("Cannot read properties of null (reading 'getConfig')") —
// this is the package's own documented Jest setup requirement, not a gap
// this project introduced. Tests that need specific env values can
// `jest.mock('react-native-config', () => ({ default: { ... } }))` per test
// file; this default mock keeps every other suite (that doesn't care about
// env vars) from crashing on the import alone.
module.exports = {
  __esModule: true,
  default: {},
};
