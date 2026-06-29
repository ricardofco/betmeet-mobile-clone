# Testing Standards

> Applied during the Construction **Test** stage. Two layers, two skills — complementary, not overlapping.

## Layer 1 — Component / unit tests (`react-native-testing-library`)
- Tooling: Jest (`@react-native/jest-preset`, see `jest.config.js`) + React Native Testing Library (skill auto-detects v13/v14).
  - `react-test-renderer` is already a devDependency; RNTL itself is not yet installed — add `@testing-library/react-native` when writing the first component test beyond the starter `__tests__/App.test.tsx`.
- **Query priority:** `getByRole` > accessible queries > `getByTestId` (last resort).
- Use the **`userEvent`** API for interactions (not raw `fireEvent`) where possible.
- v14: `render` is async — `await` it; `fireEvent` semantics changed.
- **Anti-patterns to avoid:** wrapping everything in `act()`; putting side effects inside `waitFor`.
- Matchers: `toBeOnTheScreen`, `toBeVisible`, etc.
- Test **domain logic** (Model output) as plain unit tests, no renderer needed.

## Layer 2 — Device E2E / smoke (`agent-device`)
- Drives a real simulator/emulator across iOS / Android / tvOS / macOS: snapshot → extract elements → tap/scroll/type.
- Uses **reference-based targeting** (not raw coordinates); handles RN debug overlays + keyboard.
- **Inspect (read-only) before acting.**
- Use for flows that need a real device surface and for **Re.Pack-specific checks**: a remote chunk downloads and mounts, and the fallback path works when it can't (not yet applicable — no remotes exist until `/repack-init`).

## When to use which
- Logic & component behavior → Layer 1 (fast, runs in CI).
- End-to-end flows, federation loading, native surfaces → Layer 2.
- A bolt is "done" only when Layer 1 passes; run Layer 2 for user-facing flows before handing off to Operations.
