import { createFont, createTamagui, createTokens } from 'tamagui';

/**
 * ADR-045 — Tamagui adopted in **runtime-only** mode (no Rspack-specific
 * optimizing-compiler plugin exists yet for this bundler). This config is
 * deliberately self-contained (no `@tamagui/config`/`@tamagui/config-default`
 * dependency) — just `createTamagui`/`createTokens`/`createFont` from the
 * single `tamagui` package already installed, keeping this bolt's new
 * bundler-resolution surface as small as possible while the ADR-045 probe
 * is still fresh.
 *
 * Tokens (design-standards.md instruction: compose themed primitives + design
 * tokens, light/dark from the start — never hardcode colors/spacing).
 */
// Post-Implement fix (2026-07-06, Layer 2 finding #2 — clipped button text).
// Root cause: `@tamagui/get-button-sized`'s `getButtonSized()` sets
// `height: val` resolved against the `size` token category, while
// `paddingHorizontal: getSpace(val)` resolves against the *separate*
// `space` category, for the same key (e.g. `'$true'`). This config used to
// spread `space` directly from `size` (identical values, `true: 16`) — a
// perfectly fine scale for `padding`/`gap` props, but far too small for
// `Button`'s own internal height-from-token mechanism: a 16px-tall button
// clips any real line of text (our `bodyFont`'s `lineHeight.true` is 22).
// Tamagui's own convention (confirmed via `@tamagui/get-button-sized`'s
// source above) is exactly this: `size` and `space` are two *separate*
// scales sharing key names, with `size` roughly 2-3x larger than `space` at
// the same key, so a component "sized" `$4` gets a comfortable height from
// `size.4` and comfortable padding from the *smaller* `space.4`. `space` is
// now its own standalone scale (the original small numbers, unchanged — no
// existing `padding`/`gap` usage anywhere in this bolt's screens changes);
// `size` is now a properly-scaled, larger progression for component heights
// (buttons, inputs, icons), with `true: 44` — a standard comfortable
// tap-target height.
const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  true: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 40,
  10: 48,
  12: 64,
  '-1': -4,
  '-2': -8,
} as const;

const size = {
  0: 0,
  1: 20,
  2: 24,
  3: 28,
  4: 32,
  5: 36,
  6: 40,
  7: 44,
  true: 44,
  8: 48,
  9: 52,
  10: 56,
  12: 64,
} as const;

const radius = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  true: 8,
  full: 999,
} as const;

const tokens = createTokens({
  size,
  space,
  radius,
  zIndex: { 0: 0, 1: 100, 2: 200 },
  color: {
    white: '#ffffff',
    black: '#0b0b0c',
    gray1: '#f7f7f8',
    gray2: '#e7e7ea',
    gray3: '#c9c9d1',
    gray4: '#8f8f99',
    gray5: '#5c5c66',
    gray6: '#2a2a30',
    gray7: '#1a1a1e',
    primary: '#2e7d32',
    primaryLight: '#66bb6a',
    primaryDark: '#1b5e20',
    danger: '#c62828',
    dangerLight: '#ef5350',
    warning: '#f9a825',
  },
});

const bodyFont = createFont({
  family: 'System',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 28, 8: 32, true: 16 },
  lineHeight: { 1: 16, 2: 20, 3: 22, 4: 24, 5: 26, 6: 30, 7: 34, 8: 38, true: 22 },
  weight: { 1: '400', 2: '500', 3: '600', 4: '700', true: '400' },
  letterSpacing: { 1: 0, 2: 0, 3: 0, 4: 0, true: 0 },
});

const lightTheme = {
  background: tokens.color.white,
  backgroundHover: tokens.color.gray1,
  backgroundPress: tokens.color.gray2,
  color: tokens.color.black,
  colorMuted: tokens.color.gray5,
  borderColor: tokens.color.gray3,
  primary: tokens.color.primary,
  primaryContrast: tokens.color.white,
  danger: tokens.color.danger,
  warning: tokens.color.warning,
  card: tokens.color.white,
};

const darkTheme = {
  background: tokens.color.black,
  backgroundHover: tokens.color.gray7,
  backgroundPress: tokens.color.gray6,
  color: tokens.color.white,
  colorMuted: tokens.color.gray4,
  borderColor: tokens.color.gray6,
  primary: tokens.color.primaryLight,
  primaryContrast: tokens.color.black,
  danger: tokens.color.dangerLight,
  warning: tokens.color.warning,
  card: tokens.color.gray7,
};

export const tamaguiConfig = createTamagui({
  fonts: { body: bodyFont, heading: bodyFont },
  tokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default tamaguiConfig;
