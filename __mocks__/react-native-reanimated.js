/**
 * Jest manual mock for react-native-reanimated (ADR-046). The package's own
 * shipped `react-native-reanimated/mock` re-imports the real module's init
 * path (`src/mock.ts` imports from `./index`), which in this v4 + separate
 * `react-native-worklets` shape tries to install the real native TurboModule
 * unpackers and crashes under Jest (`Cannot read properties of undefined
 * (reading 'loadUnpackers')`) — not usable as-is.
 *
 * This repo's own code never calls a reanimated API directly (only
 * `@react-navigation/drawer`'s internal `react-native-drawer-layout`
 * dependency does, for its slide animation) — this hand-written mock
 * implements exactly the surface that one consumer needs (confirmed by
 * reading `node_modules/react-native-drawer-layout/src/views/Drawer.native.tsx`
 * directly), same "small, purpose-built manual mock" pattern already used
 * for `react-native-qrcode-svg`/`react-native-image-picker` in this
 * `__mocks__/` directory.
 */
const React = require('react');
const { View, Text, Image, ScrollView, FlatList } = require('react-native');

function useSharedValue(initial) {
  const ref = React.useRef({ value: initial });
  return ref.current;
}

function useDerivedValue(fn) {
  const ref = React.useRef({ value: fn() });
  ref.current.value = fn();
  return ref.current;
}

function useAnimatedStyle(fn) {
  return fn();
}

function useAnimatedProps(fn) {
  return fn();
}

function interpolate(value, inputRange, outputRange) {
  if (outputRange.length === 0) return undefined;
  return outputRange[0];
}

function withSpring(toValue) {
  return toValue;
}

function withTiming(toValue) {
  return toValue;
}

function runOnJS(fn) {
  return (...args) => fn(...args);
}

const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
const Extrapolation = { EXTEND: 'extend', CLAMP: 'clamp', IDENTITY: 'identity' };

function createAnimatedComponent(Component) {
  return Component;
}

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent,
};

module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedProps,
  interpolate,
  withSpring,
  withTiming,
  runOnJS,
  ReduceMotion,
  Extrapolation,
  createAnimatedComponent,
};
