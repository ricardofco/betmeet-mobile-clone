/**
 * @format
 */

// Must run BEFORE the app registers/renders so Re.Pack's ScriptManager knows
// where to fetch federated remote containers/chunks from at runtime (ADR-002).
import './src/host/script-manager-setup';
// Required at the very top of the entry point by react-native-gesture-handler.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
