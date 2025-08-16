import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { darkColdTheme } from './src/themes/darkTheme';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={darkColdTheme}>
        <AppNavigator />
        <StatusBar style="light" backgroundColor={darkColdTheme.colors.surface} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
