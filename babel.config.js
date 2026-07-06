module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // react-native-reanimated v4 delegates its worklet transform to the
  // separate `react-native-worklets` package (Bolt 9, ADR-046) — required by
  // `@react-navigation/drawer`'s peer dependency. Must be listed last, per
  // both packages' own setup docs.
  plugins: ['react-native-worklets/plugin'],
};
