/**
 * Standalone entry point for the `pools` remote — used only when running
 * this remote's own dev server in isolation (see SETUP notes in
 * `rspack.config.pools-remote.mjs`). The host never loads the app through
 * this file; it loads the exposed `./App` module directly via Module
 * Federation. This file exists because Rspack requires an entry to build a
 * runnable bundle for standalone preview/testing (mirrors
 * `src/remotes/education/index.js`).
 *
 * @format
 */
import { AppRegistry } from 'react-native';
import PoolsRemoteEntry from './PoolsRemoteEntry';

AppRegistry.registerComponent('BetmeetPoolsRemotePreview', () => PoolsRemoteEntry);
