// ---------------------------------------------------------------------------
// App.tsx  –  Entry point
// ---------------------------------------------------------------------------

import 'react-native-gesture-handler'; // must be first
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  // Restore persisted auth token on app launch
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#000" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
