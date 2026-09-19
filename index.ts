import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';
import { createElement } from 'react';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { widgetTaskHandler } from './widget-task-handler';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(() => createElement(SafeAreaProvider, null, createElement(App)));
if (Platform.OS === 'android' && Constants.appOwnership !== 'expo') registerWidgetTaskHandler(widgetTaskHandler);
