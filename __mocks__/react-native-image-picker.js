/**
 * Jest manual mock for react-native-image-picker (Bolt 3, design.md §7).
 * The real package launches native camera/library UI — not available under
 * Jest. Tests provide their own resolved value via
 * `jest.mocked(launchImageLibrary).mockResolvedValue(...)`; this default
 * export resolves to a cancelled-picker response so unmocked calls don't
 * hang.
 */
async function launchImageLibrary() {
  return { didCancel: true, assets: undefined };
}

async function launchCamera() {
  return { didCancel: true, assets: undefined };
}

module.exports = { launchImageLibrary, launchCamera };
