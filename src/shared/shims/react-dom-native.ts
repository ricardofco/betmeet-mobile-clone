// Bolt 9 (ADR-045 follow-up) — stand-in for the `react-dom` package on native.
//
// `@tamagui/popper`'s `Popper.native.js` has a static top-level
// `import { flushSync } from "react-dom"`, unconditionally pulled in by
// `tamagui`'s root barrel (`create-menu` -> `menu` -> `tamagui/index.native.js`).
// An `IgnorePlugin` on `react-dom` replaces that import with a stub that
// *throws when evaluated* rather than an empty module — harmless for
// `@react-native-masked-view` (guarded by upstream try/catch) but fatal here,
// since the import executes at module-eval time as soon as anything imports
// `tamagui`. Aliasing `react-dom` to this shim resolves it to a real module
// instead. `flushSync` on the web forces a synchronous render flush inside
// its callback; without React DOM's concurrent scheduler to defer, invoking
// the callback synchronously is an equivalent no-op on native.
export function flushSync<T>(fn: () => T): T {
  return fn();
}

export default { flushSync };
