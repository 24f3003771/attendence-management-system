// ---------------------------------------------------------------------------
// src/screens/LoginScreen.tsx
// Employee login – no registration, no logout anywhere in the app
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { LoginPayload, LoginResponse } from '../types';

// Derive a stable device identifier
const getDeviceId = (): string => {
  const appId = Application.applicationId ?? 'unknown.app';
  const model = Device.modelName ?? 'unknown-model';
  const brand = Device.brand ?? 'unknown-brand';
  return `${appId}__${brand}__${model}`.replace(/\s+/g, '_');
};

const LoginScreen: React.FC = () => {
  const login = useAuthStore((s) => s.login);

  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!employeeCode.trim() || !password.trim()) {
      setErrorMsg('Please enter Employee Code and Password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    const deviceId = getDeviceId();
    const payload: LoginPayload = {
      employeeCode: employeeCode.trim(),
      password,
      deviceId,
    };

    try {
      const { data } = await apiClient.post<LoginResponse>('/api/auth/employee/login', payload);
      await login(data.token);
      // Navigation is handled by AppNavigator reacting to isLoggedIn state
    } catch (err: any) {
      const serverMsg: string =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        '';

      if (
        serverMsg.toLowerCase().includes('device not registered') ||
        serverMsg.toLowerCase().includes('device')
      ) {
        setErrorMsg('Please contact your admin to register this device.');
      } else if (err?.response?.status === 401) {
        setErrorMsg('Invalid Employee Code or Password.');
      } else if (err?.response?.status === 403) {
        setErrorMsg('Please contact your admin to register this device.');
      } else if (!err?.response) {
        setErrorMsg('Cannot reach server. Check your network connection.');
      } else {
        setErrorMsg(serverMsg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appIcon}>📋</Text>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>Employee Portal</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Employee Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. EMP001"
            placeholderTextColor="#555"
            value={employeeCode}
            onChangeText={setEmployeeCode}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Device info – helpful for admin */}
        <Text style={styles.deviceNote}>
          Device ID: {getDeviceId().slice(0, 40)}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  fieldLabel: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorBox: {
    backgroundColor: '#FF000020',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    lineHeight: 18,
  },
  loginBtn: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deviceNote: {
    color: '#333',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 24,
  },
});

export default LoginScreen;
