# ADR-007 — TOTP QR Code Rendering: react-native-qrcode-svg

**Date:** 2026-06-29
**Status:** Accepted
**Bolt:** 2 — Auth Secondary Flows

---

## Context

AUTH-3's TOTP enrollment flow requires displaying a QR code so the user can scan it with their authenticator app. The QR code URI is provided by Supabase's `mfa.enroll` API as an `otpauth://totp/...` string in the `totp.qr_code` field.

Requirements §8 specifies `react-native-svg` as a required native dependency. QR code rendering in React Native natively uses SVG as the rendering target.

Two candidate packages were evaluated:

**Option A — `react-native-qrcode-svg`**: a React Native component that renders a QR code as an SVG. Wraps `react-native-svg`; accepts any string as input and renders it as a QR matrix. Actively maintained, ~300k weekly npm downloads (as of 2026).

**Option B — `react-native-svg` + custom QR matrix generator**: implement QR code encoding and SVG path generation from scratch or with a pure-JS QR encoder (`qrcode` npm package), then render the SVG manually using `react-native-svg` primitives.

---

## Decision

**Option A — `react-native-qrcode-svg`** is the specific package for QR generation.

Reasons:
1. It directly wraps `react-native-svg` (which requirements §8 mandates), adding no unrelated native dependency.
2. A single `<QRCode value={qrCodeUri} size={200} />` call is sufficient. Option B would require shipping a pure-JS QR encoder and custom SVG rendering — hundreds of lines of untested complexity for a standard solved problem.
3. The QR code display is read-only UI (no interaction, no animation) — there are no performance concerns that would motivate a custom implementation.
4. `react-native-svg` is already required; `react-native-qrcode-svg` simply adds a thin React component on top of it.

### Exact packages installed

```bash
yarn add react-native-svg react-native-qrcode-svg
cd ios && bundle exec pod install && cd ..
```

Exact versions installed: `react-native-svg@15.15.5`, `react-native-qrcode-svg@6.3.21`.

### iOS native setup

`react-native-svg` requires a native CocoaPod. After `yarn add`, `cd ios && bundle exec pod install` links the SVG native module. This is a one-time step per environment (CI must also run `pod install`).

### Android native setup

`react-native-svg` auto-links on Android (React Native 0.60+ autolink). No manual `build.gradle` changes required.

### Jest mocking

`react-native-svg` and `react-native-qrcode-svg` ship compiled native code that cannot run under Jest. Both are mocked in the `transformIgnorePatterns` allowlist (already extended in `jest.config.js` from Bolt 0). A simple `__mocks__` shim for `react-native-qrcode-svg` returns a `View` so RNTL tests render without crashing.

---

## Consequences

- `react-native-svg` and `react-native-qrcode-svg` are new runtime dependencies. iOS requires `pod install` after adding them.
- The QR code rendered in `TotpEnrollmentScreen` is the Supabase-provided `otpauth://totp/` URI — no custom QR encoding logic lives in the app.
- Jest tests for `TotpEnrollmentScreen` mock `react-native-qrcode-svg` as a simple `View` — the test verifies the component is rendered, not the QR pixel output.
- If Supabase ever changes the `totp.qr_code` field name, the adapter method (`enrollTotp`) is the single point of change.
