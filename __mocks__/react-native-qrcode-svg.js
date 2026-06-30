/**
 * Jest manual mock for react-native-qrcode-svg (ADR-007).
 * The real package renders native SVG — not available under Jest.
 * Tests verify the component is mounted (via testID); pixel output is
 * not under test.
 */
const React = require('react');
const { View } = require('react-native');

function QRCode({ testID }) {
  return React.createElement(View, { testID: testID ?? 'qr-code' });
}

module.exports = QRCode;
module.exports.default = QRCode;
