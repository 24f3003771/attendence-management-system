// ---------------------------------------------------------------------------
// src/screens/ResultScreen.tsx
// Displays scan result; auto-returns to Scanner after 3-second countdown
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScannerStackParamList } from '../types';

type Props = NativeStackScreenProps<ScannerStackParamList, 'Result'>;

const AUTO_RETURN_SEC = 3;

const ResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scanResult } = route.params;
  const [countdown, setCountdown] = useState(AUTO_RETURN_SEC);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const isSuccess = scanResult.success;
  const icon = isSuccess ? '✅' : '❌';
  const iconBg = isSuccess ? '#4CAF5020' : '#FF6B6B20';
  const iconBorder = isSuccess ? '#4CAF50' : '#FF6B6B';

  const formattedTime = (() => {
    if (!scanResult.time) return '';
    try {
      const d = new Date(scanResult.time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return scanResult.time;
    }
  })();

  const headlineText = (() => {
    if (!isSuccess) return scanResult.message || 'Scan Failed';
    if (scanResult.type === 'IN') return `Signed In at ${formattedTime}`;
    if (scanResult.type === 'OUT') return `Signed Out at ${formattedTime}`;
    return scanResult.message;
  })();

  // Bounce-in animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  }, [scaleAnim]);

  // Countdown + auto-navigate
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigation.navigate('ScannerHome');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigation]);

  const goBack = () => navigation.navigate('ScannerHome');

  return (
    <View style={styles.root}>
      {/* Big animated icon */}
      <Animated.View
        style={[
          styles.iconWrapper,
          { backgroundColor: iconBg, borderColor: iconBorder },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </Animated.View>

      {/* Headline */}
      <Text style={[styles.headline, { color: isSuccess ? '#4CAF50' : '#FF6B6B' }]}>
        {headlineText}
      </Text>

      {/* Message (shown on failure or additional context) */}
      {scanResult.message && scanResult.message !== headlineText && (
        <Text style={styles.subMessage}>{scanResult.message}</Text>
      )}

      {/* Location details */}
      {isSuccess && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Location Captured</Text>
          <Text style={styles.locationRow}>
            📍 {scanResult.latitude.toFixed(6)}, {scanResult.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationRow}>
            🎯 Accuracy: {Math.round(scanResult.accuracyM)} m
          </Text>
        </View>
      )}

      {/* Countdown */}
      <View style={styles.countdownRow}>
        <Text style={styles.countdownText}>
          Returning in <Text style={styles.countdownNum}>{countdown}</Text>s…
        </Text>
      </View>

      {/* Manual button */}
      <TouchableOpacity style={styles.scanAgainBtn} onPress={goBack} activeOpacity={0.8}>
        <Text style={styles.scanAgainText}>Scan Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  icon: {
    fontSize: 60,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  subMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  locationCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  locationTitle: {
    color: '#666',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  locationRow: {
    color: '#CCC',
    fontSize: 13,
    marginVertical: 3,
  },
  countdownRow: {
    marginTop: 32,
  },
  countdownText: {
    color: '#555',
    fontSize: 14,
  },
  countdownNum: {
    color: '#888',
    fontWeight: '700',
  },
  scanAgainBtn: {
    marginTop: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  scanAgainText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ResultScreen;
