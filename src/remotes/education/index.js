/**
 * Standalone entry point for the `education` remote — used only when running
 * this remote's own dev server in isolation (see SETUP notes in
 * `rspack.config.education-remote.mjs`). The host never loads the app
 * through this file; it loads the exposed `./App` module directly via
 * Module Federation. This file exists because Rspack requires an entry to
 * build a runnable bundle for standalone preview/testing.
 *
 * @format
 */
import { AppRegistry } from 'react-native';
import EducationRemoteEntry from './EducationRemoteEntry';

AppRegistry.registerComponent(
  'BetmeetEducationRemotePreview',
  () => EducationRemoteEntry,
);
