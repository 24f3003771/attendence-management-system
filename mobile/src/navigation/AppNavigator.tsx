// ---------------------------------------------------------------------------
// src/navigation/AppNavigator.tsx
// Root navigator: unauthenticated → Login, authenticated → Bottom Tabs
// No logout option is exposed anywhere in the UI.
// ---------------------------------------------------------------------------

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ResultScreen from '../screens/ResultScreen';
import HistoryScreen from '../screens/HistoryScreen';

import {
  RootStackParamList,
  MainTabParamList,
  ScannerStackParamList,
} from '../types';

// ── Stack navigator types ─────────────────────────────────────────────────
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const ScannerStack = createNativeStackNavigator<ScannerStackParamList>();

// ── Scanner stack (Scanner → Result → back) ───────────────────────────────
const ScannerStackNavigator: React.FC = () => (
  <ScannerStack.Navigator screenOptions={{ headerShown: false }}>
    <ScannerStack.Screen name="ScannerHome" component={ScannerScreen} />
    <ScannerStack.Screen
      name="Result"
      component={ResultScreen}
      options={{ gestureEnabled: false }} // prevent swipe-back to re-use result
    />
  </ScannerStack.Navigator>
);

// ── Bottom tab icons ──────────────────────────────────────────────────────
type TabIconProps = { color: string; focused: boolean };

const ScanIcon: React.FC<TabIconProps> = ({ color }) => (
  <Text style={{ fontSize: 22, color }}>📷</Text>
);
const HistoryIcon: React.FC<TabIconProps> = ({ color }) => (
  <Text style={{ fontSize: 22, color }}>📋</Text>
);

// ── Main tab navigator ────────────────────────────────────────────────────
const MainTabNavigator: React.FC = () => (
  <MainTab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0D0D0D',
        borderTopColor: '#1A1A1A',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
      tabBarActiveTintColor: '#FFFFFF',
      tabBarInactiveTintColor: '#555',
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    }}
  >
    <MainTab.Screen
      name="Scanner"
      component={ScannerStackNavigator}
      options={{
        tabBarLabel: 'Scan',
        tabBarIcon: ScanIcon,
      }}
    />
    <MainTab.Screen
      name="History"
      component={HistoryScreen}
      options={{
        tabBarLabel: 'History',
        tabBarIcon: HistoryIcon,
        headerShown: true,
        headerStyle: { backgroundColor: '#000' },
        headerTitleStyle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
        headerTitle: 'History',
      }}
    />
  </MainTab.Navigator>
);

// ── Root navigator ────────────────────────────────────────────────────────
const AppNavigator: React.FC = () => {
  const { isLoggedIn, isHydrated } = useAuthStore();

  // Show splash/loader while restoring token from SecureStore
  if (!isHydrated) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>📋</Text>
        <ActivityIndicator color="#FFF" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isLoggedIn ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    fontSize: 64,
  },
});

export default AppNavigator;
