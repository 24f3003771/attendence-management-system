// ---------------------------------------------------------------------------
// src/screens/ScannerScreen.tsx
// QR scanner with live GPS fix, anti-fake guards & selfie photo upload
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Camera, CameraType, BarCodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import StatusCard from '../components/StatusCard';
import apiClient from '../api/client';
import { ScannerStackParamList, ScanPayload, ScanResponse, TodayStatus } from '../types';

type NavProp = NativeStackNavigationProp<ScannerStackParamList, 'ScannerHome'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CUTOUT_SIZE = SCREEN_W * 0.68;

type ScanState =
  | 'REQUESTING_PERM'
  | 'PERM_DENIED'
  | 'LOCATION_OFF'
  | 'SCANNING'
  | 'GETTING_GPS'
  | 'TAKE_PHOTO'
  | 'SUBMITTING'
  | 'ERROR';

const getDeviceId = (): string => {
  const appId = Application.applicationId ?? 'unknown.app';
  const model = Device.modelName ?? 'unknown-model';
  const brand = Device.brand ?? 'unknown-brand';
  return `${appId}__${brand}__${model}`.replace(/\s+/g, '_');
};

const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const cameraRef = useRef<Camera | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>(CameraType.back);

  const [camPermission, setCamPermission] = useState<boolean | null>(null);
  const [locPermission, setLocPermission] = useState<boolean | null>(null);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState<boolean>(true);
  const [scanState, setScanState] = useState<ScanState>('REQUESTING_PERM');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Omit<ScanPayload, 'photoBase64'> | null>(null);

  // Prevent duplicate scans while navigating away
  const processingRef = useRef(false);
  const accuracyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch today's status from server ────────────────────────────────────
  const fetchTodayStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get<TodayStatus>('/api/attendance/today-status');
      setTodayStatus(data);
    } catch {
      // Non-critical – silently ignore
    }
  }, []);

  // ── Request permissions on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Camera permission
      const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
      const camGranted = camStatus === 'granted';
      setCamPermission(camGranted);

      // Location services check
      const enabled = await Location.hasServicesEnabledAsync();
      setLocationServicesEnabled(enabled);

      // Location permission
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      const locGranted = locStatus === 'granted';
      setLocPermission(locGranted);

      if (!camGranted || !locGranted) {
        setScanState('PERM_DENIED');
      } else if (!enabled) {
        setScanState('LOCATION_OFF');
      } else {
        setScanState('SCANNING');
        fetchTodayStatus();
      }
    })();

    return () => {
      if (accuracyPollRef.current) clearInterval(accuracyPollRef.current);
    };
  }, [fetchTodayStatus]);

  // ── Barcode detected ─────────────────────────────────────────────────────
  const handleBarCodeScanned = useCallback(
    async ({ data: rawData }: BarCodeScanningResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);

      try {
        // Step 1: Parse QR payload (JWT or signed token)
        let qrToken = rawData.trim();
        try {
          const parsed = JSON.parse(rawData);
          if (parsed?.token) qrToken = parsed.token;
          else if (parsed?.qrToken) qrToken = parsed.qrToken;
        } catch {
          // Plain string token — use as is
        }

        if (!qrToken) {
          throw new Error('Invalid QR code format');
        }

        // Step 2: Switch to GPS-fetching state
        setScanState('GETTING_GPS');

        // Step 3: Fresh high-accuracy GPS fix
        let position: Location.LocationObject;
        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 0,
            mayShowUserSettingsDialog: true,
          });
        } catch {
          if (accuracyPollRef.current) clearInterval(accuracyPollRef.current);
          setScanState('ERROR');
          setErrorMsg('Could not get GPS fix. Please move outdoors and try again.');
          processingRef.current = false;
          setIsProcessing(false);
          return;
        }

        if (accuracyPollRef.current) clearInterval(accuracyPollRef.current);

        const { latitude, longitude, accuracy, altitude } = position.coords;
        const accuracyM = accuracy ?? 999;

        // Step 4: Accuracy gate <= 30 m
        if (accuracyM > 30) {
          setScanState('ERROR');
          setErrorMsg(
            `GPS accuracy too low (${Math.round(accuracyM)} m). Move outdoors and try again.`,
          );
          processingRef.current = false;
          setIsProcessing(false);
          return;
        }

        // Step 5: Mock location detection
        let isMockLocation = false;
        let provider = 'gps';
        try {
          const providerStatus = await Location.getProviderStatusAsync();
          isMockLocation =
            (providerStatus as any).isMockModeEnabled ??
            (providerStatus as any).mockLocationsEnabled ??
            false;
          if (providerStatus.gpsAvailable) provider = 'gps';
          else if (providerStatus.networkAvailable) provider = 'network';
          else provider = 'unknown';
        } catch { /* ignore */ }

        // Step 6: Save pending data & prompt for verification selfie
        setPendingPayload({
          qrToken,
          latitude,
          longitude,
          accuracyM,
          altitude: altitude ?? null,
          provider,
          deviceId: getDeviceId(),
          isMockLocation,
        });

        // Switch to front selfie camera for photo capture
        setCameraFacing(CameraType.front);
        setScanState('TAKE_PHOTO');
      } catch (err: any) {
        if (accuracyPollRef.current) clearInterval(accuracyPollRef.current);
        const msg: string =
          err?.response?.data?.message ??
          err?.response?.data?.error ??
          err?.message ??
          'Scan failed. Please try again.';
        setScanState('ERROR');
        setErrorMsg(msg);
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [],
  );

  // ── Take photo and submit attendance ──────────────────────────────────────
  const takePhotoAndSubmit = async () => {
    if (!cameraRef.current || !pendingPayload || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: true,
      });

      setScanState('SUBMITTING');

      const payload: ScanPayload = {
        ...pendingPayload,
        photoBase64: photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : undefined,
      };

      const { data: scanResult } = await apiClient.post<ScanResponse>(
        '/api/attendance/scan',
        payload,
      );

      // Navigate to result
      navigation.navigate('Result', { scanResult });
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Failed to record attendance.';
      setScanState('ERROR');
      setErrorMsg(msg);
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // ── Retry / Reset after error or cancel ────────────────────────────────────
  const resetToScanning = () => {
    setErrorMsg('');
    setLiveAccuracy(null);
    setPendingPayload(null);
    setCameraFacing(CameraType.back);
    processingRef.current = false;
    setIsProcessing(false);
    setScanState('SCANNING');
    fetchTodayStatus();
  };

  // ── Flip camera between front & back ──────────────────────────────────────
  const toggleCameraFacing = () => {
    setCameraFacing((current) =>
      current === CameraType.back ? CameraType.front : CameraType.back,
    );
  };

  // ── Open system settings ─────────────────────────────────────────────────
  const openSettings = () => Linking.openSettings();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (scanState === 'REQUESTING_PERM') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4CAF50" size="large" />
        <Text style={styles.infoText}>Requesting permissions…</Text>
      </View>
    );
  }

  if (scanState === 'PERM_DENIED') {
    const cameraBlocked = camPermission === false;
    const locationBlocked = locPermission === false;
    return (
      <View style={styles.centered}>
        <Text style={styles.permIcon}>🔒</Text>
        <Text style={styles.permTitle}>Permissions Required</Text>
        {cameraBlocked && (
          <Text style={styles.permBody}>
            Camera access is required to scan the attendance QR code and take verification photo.
          </Text>
        )}
        {locationBlocked && (
          <Text style={styles.permBody}>
            Location access is needed to verify your position during attendance.
          </Text>
        )}
        <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
          <Text style={styles.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (scanState === 'LOCATION_OFF') {
    return (
      <View style={styles.centered}>
        <Text style={styles.permIcon}>📍</Text>
        <Text style={styles.permTitle}>Location Services Off</Text>
        <Text style={styles.permBody}>
          Please enable Location Services in your device settings to record attendance.
        </Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
          <Text style={styles.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (scanState === 'ERROR') {
    return (
      <View style={styles.centered}>
        <Text style={styles.permIcon}>⚠️</Text>
        <Text style={styles.permTitle}>Scan Failed</Text>
        <Text style={styles.permBody}>{errorMsg}</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={resetToScanning}>
          <Text style={styles.settingsBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Selfie Capture Mode (TAKE_PHOTO) ──────────────────────────────────────
  if (scanState === 'TAKE_PHOTO' || (scanState === 'SUBMITTING' && isCapturing)) {
    return (
      <View style={styles.root}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          type={cameraFacing}
        />

        {/* Top Header */}
        <View style={styles.photoTopBar}>
          <Text style={styles.photoTitle}>📸 Verification Selfie</Text>
          <Text style={styles.photoSubtitle}>
            Position your face inside the frame to verify attendance
          </Text>
        </View>

        {/* Oval Face Guide */}
        <View style={styles.faceGuideContainer}>
          <View style={styles.faceOval} />
        </View>

        {/* Bottom Action Controls */}
        <View style={styles.photoBottomBar}>
          <TouchableOpacity
            style={styles.cancelPhotoBtn}
            onPress={resetToScanning}
            disabled={isCapturing}
          >
            <Text style={styles.cancelPhotoText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && { opacity: 0.6 }]}
            onPress={takePhotoAndSubmit}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <View style={styles.captureInnerCircle} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipCameraBtn}
            onPress={toggleCameraFacing}
            disabled={isCapturing}
          >
            <Text style={styles.flipCameraText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Active QR Scanner (SCANNING | GETTING_GPS | SUBMITTING) ─────────────────
  const isOverlayActive = scanState === 'GETTING_GPS' || scanState === 'SUBMITTING';

  return (
    <View style={styles.root}>
      {/* Status card */}
      <StatusCard status={todayStatus} />

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          type={CameraType.back}
          onBarCodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
        />

        {/* Dark overlay with cutout */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          {/* Cutout – transparent */}
          <View style={styles.cutout}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {isOverlayActive ? (
            <View style={styles.gpsIndicator}>
              <ActivityIndicator color="#4CAF50" size="small" />
              <Text style={styles.gpsText}>
                {scanState === 'GETTING_GPS'
                  ? `Verifying GPS location…${liveAccuracy != null ? ` (${liveAccuracy} m)` : ''}`
                  : 'Submitting attendance…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.scanHint}>Point camera at Office QR Code</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
const CORNER_COLOR = '#4CAF50';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  // Cutout overlay layers
  overlayTop: {
    flex: 1,
    backgroundColor: '#0009',
  },
  overlayMiddleRow: {
    height: CUTOUT_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: '#0009',
  },
  cutout: {
    width: CUTOUT_SIZE,
    height: CUTOUT_SIZE,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: '#0009',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
  },
  // GPS / hint text
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  gpsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  scanHint: {
    color: '#AAA',
    fontSize: 15,
  },
  // Selfie / Photo capture screen
  photoTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    zIndex: 10,
  },
  photoTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  photoSubtitle: {
    color: '#DDD',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  faceGuideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: 230,
    height: 310,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  photoBottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  captureInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#4CAF50',
  },
  cancelPhotoBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  cancelPhotoText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  flipCameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipCameraText: {
    fontSize: 22,
  },
  // Permission / error full-screen
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  permTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permBody: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  settingsBtn: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 24,
  },
  settingsBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  infoText: {
    color: '#888',
    marginTop: 16,
    fontSize: 14,
  },
});

export default ScannerScreen;
