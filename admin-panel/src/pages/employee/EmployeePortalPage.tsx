import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  QrCodeIcon,
  ClockIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  CameraIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';
import { useEmployeeAuthStore } from '../../store/employeeAuthStore';

type Tab = 'SCAN' | 'HISTORY' | 'PROFILE';
type ScanStep = 'SCAN_QR' | 'TAKE_SELFIE' | 'SUBMITTING' | 'SUCCESS';

interface TodayStatus {
  status: 'NONE' | 'SIGNED_IN' | 'SIGNED_OUT';
  signInTime: string | null;
  signOutTime: string | null;
}

interface MyAttendanceRecord {
  id: string;
  type: 'IN' | 'OUT';
  serverTime: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  status: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EmployeePortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { employee, token, deviceId, logout } = useEmployeeAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('SCAN');
  const [scanStep, setScanStep] = useState<ScanStep>('SCAN_QR');
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [history, setHistory] = useState<MyAttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scan state
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  // Front camera selfie stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Auth guard
  useEffect(() => {
    if (!token || !employee) {
      navigate('/employee/login');
    }
  }, [token, employee, navigate]);

  // Fetch today status
  const fetchTodayStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/attendance/today-status');
      setTodayStatus(res.data.data);
    } catch {
      // non-critical
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await apiClient.get('/api/attendance/my-history');
      setHistory(res.data.data.records || []);
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchTodayStatus();
      if (activeTab === 'HISTORY') fetchHistory();
    }
  }, [token, activeTab, fetchTodayStatus, fetchHistory]);

  // ─── Step 1: Start QR Code Scanner ──────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'SCAN' || scanStep !== 'SCAN_QR') {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {});
        qrScannerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const scannerId = 'qr-reader';

    const startScanner = async () => {
      try {
        const qrScanner = new Html5Qrcode(scannerId);
        qrScannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (!isMounted) return;
            // Stop scanning once detected
            try {
              await qrScanner.stop();
              qrScannerRef.current = null;
            } catch { /* ignore */ }

            let tokenVal = decodedText.trim();
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed?.token) tokenVal = parsed.token;
              else if (parsed?.qrToken) tokenVal = parsed.qrToken;
            } catch { /* plain string */ }

            setScannedToken(tokenVal);
            toast.success('QR Code verified! Getting GPS location…');

            // Get GPS fix
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setGpsLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    acc: pos.coords.accuracy,
                  });
                  setScanStep('TAKE_SELFIE');
                },
                (err) => {
                  toast.error('GPS location required: ' + err.message);
                  setScanStep('SCAN_QR');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
              );
            } else {
              toast.error('Geolocation is not supported by your browser');
              setScanStep('SCAN_QR');
            }
          },
          () => {} // frame error swallow
        );
      } catch (err: any) {
        toast.error('Camera permission required to scan QR code');
      }
    };

    // Small delay to ensure container exists in DOM
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(() => {});
        qrScannerRef.current = null;
      }
    };
  }, [activeTab, scanStep]);

  // ─── Step 2: Front Camera for Selfie ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'SCAN' && scanStep === 'TAKE_SELFIE') {
      let stream: MediaStream | null = null;
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        })
        .then((s) => {
          stream = s;
          selfieStreamRef.current = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          toast.error('Front camera access required for verification selfie');
        });

      return () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
        if (selfieStreamRef.current) {
          selfieStreamRef.current.getTracks().forEach((t) => t.stop());
          selfieStreamRef.current = null;
        }
      };
    }
  }, [activeTab, scanStep]);

  // ─── Capture Selfie and Submit Attendance ───────────────────────────────────
  const captureSelfieAndSubmit = async () => {
    if (!videoRef.current || !scannedToken || !gpsLocation) return;

    try {
      setScanStep('SUBMITTING');

      // 1. Draw video frame to canvas to get base64 JPEG
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.85);

      // Stop front camera stream
      if (selfieStreamRef.current) {
        selfieStreamRef.current.getTracks().forEach((t) => t.stop());
        selfieStreamRef.current = null;
      }

      // 2. Submit to backend API
      const res = await apiClient.post('/api/attendance/scan', {
        qrToken: scannedToken,
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
        accuracyM: gpsLocation.acc,
        deviceId,
        isMockLocation: false,
        photoBase64,
      });

      setLastScanResult(res.data.data);
      setScanStep('SUCCESS');
      fetchTodayStatus();

      // Trigger Confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(res.data.data.message || 'Attendance recorded successfully!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Punch failed. Please check office geofence or QR validity.';
      toast.error(msg);
      setScanStep('SCAN_QR');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/employee/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto shadow-2xl relative border-x border-slate-900">
      {/* ─── Top Header ───────────────────────────────────────────────────────── */}
      <header className="px-5 pt-6 pb-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
            {employee?.employeeCode}
          </span>
          <h1 className="text-lg font-bold text-white truncate max-w-[200px]">
            {employee?.name}
          </h1>
          <p className="text-xs text-slate-400">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
        </button>
      </header>

      {/* ─── Main Content Body ────────────────────────────────────────────────── */}
      <main className="flex-1 p-5 overflow-y-auto pb-24">
        {/* Today's Status Card */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-slate-800 p-4 rounded-2xl shadow-lg mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Today's Punch Status</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                todayStatus?.status === 'SIGNED_IN'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : todayStatus?.status === 'SIGNED_OUT'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {todayStatus?.status === 'SIGNED_IN'
                ? 'Signed In'
                : todayStatus?.status === 'SIGNED_OUT'
                ? 'Signed Out'
                : 'Not Punched'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">PUNCH IN</span>
              <span className="text-sm font-bold text-emerald-400">
                {todayStatus?.signInTime
                  ? format(new Date(todayStatus.signInTime), 'hh:mm a')
                  : '—'}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">PUNCH OUT</span>
              <span className="text-sm font-bold text-indigo-400">
                {todayStatus?.signOutTime
                  ? format(new Date(todayStatus.signOutTime), 'hh:mm a')
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── TAB 1: SCAN & PUNCH ─────────────────────────────────────────────── */}
        {activeTab === 'SCAN' && (
          <div className="space-y-4">
            {/* Step 1: Scan QR */}
            {scanStep === 'SCAN_QR' && (
              <div className="flex flex-col items-center">
                <div className="text-center mb-3">
                  <h2 className="text-base font-bold text-white">Scan Office QR Code</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Align the rotating QR code on screen inside the scanner
                  </p>
                </div>

                {/* QR Scanner Container */}
                <div className="w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl relative bg-black">
                  <div id="qr-reader" className="w-full h-full" />
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
                  <MapPinIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>GPS location will be automatically verified</span>
                </div>
              </div>
            )}

            {/* Step 2: Take Selfie */}
            {scanStep === 'TAKE_SELFIE' && (
              <div className="flex flex-col items-center animate-in fade-in">
                <div className="text-center mb-3">
                  <h2 className="text-base font-bold text-white">📸 Take Attendance Selfie</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Position your face inside the oval frame for verification
                  </p>
                </div>

                {/* Selfie Video Stream */}
                <div className="relative w-full aspect-[3/4] max-w-[280px] rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Oval Frame Guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[190px] h-[250px] rounded-[100px] border-2 border-dashed border-emerald-400/80 bg-black/10" />
                  </div>
                </div>

                {/* Capture Button */}
                <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-[280px]">
                  <button
                    onClick={captureSelfieAndSubmit}
                    className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CameraIcon className="w-5 h-5" />
                    <span>Click Selfie & Punch</span>
                  </button>

                  <button
                    onClick={() => setScanStep('SCAN_QR')}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel & Rescan QR
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Submitting */}
            {scanStep === 'SUBMITTING' && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white">Verifying & Watermarking…</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Applying GPS timestamp watermark and saving attendance record
                </p>
              </div>
            )}

            {/* Step 4: Success Screen */}
            {scanStep === 'SUCCESS' && lastScanResult && (
              <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-xl shadow-emerald-500/20">
                  <CheckCircleIcon className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  PUNCH {lastScanResult.type} SUCCESSFUL!
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Recorded at {format(new Date(lastScanResult.serverTime), 'hh:mm:ss a, dd MMM yyyy')}
                </p>

                {/* Watermarked photo thumbnail */}
                {lastScanResult.attendance?.photoUrl && (
                  <div className="mt-5 p-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-w-[180px]">
                    <img
                      src={`${BASE_URL}${lastScanResult.attendance.photoUrl}`}
                      alt="Watermarked Selfie"
                      className="rounded-xl w-full object-cover"
                    />
                    <span className="text-[10px] text-slate-400 block py-1">Watermarked Selfie</span>
                  </div>
                )}

                <button
                  onClick={() => setScanStep('SCAN_QR')}
                  className="mt-6 w-full max-w-[240px] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Done / Scan Another
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: MY HISTORY ──────────────────────────────────────────────── */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-white">My Attendance Log</h2>
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <ArrowPathIcon className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-16 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No attendance records found yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-slate-900 border border-slate-800/90 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {rec.photoUrl ? (
                        <img
                          src={`${BASE_URL}${rec.photoUrl}`}
                          alt="Punch Photo"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                          <ClockIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              rec.type === 'IN'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-indigo-500/20 text-indigo-400'
                            }`}
                          >
                            PUNCH {rec.type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {format(new Date(rec.serverTime), 'hh:mm a')}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          {format(new Date(rec.serverTime), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] px-2 py-1 bg-slate-800 text-slate-400 rounded-lg">
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: MY PROFILE ──────────────────────────────────────────────── */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white mb-2">My Profile</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserCircleIcon className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{employee?.name}</h3>
                  <span className="text-xs text-indigo-400">{employee?.employeeCode}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Employee ID</span>
                  <span className="text-white font-mono">{employee?.id.substring(0, 12)}…</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Office Bound</span>
                  <span className="text-white">Assigned Office</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Browser Device ID</span>
                  <span className="text-slate-300 font-mono text-[10px] truncate max-w-[150px]">
                    {deviceId}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-semibold rounded-xl text-xs border border-red-500/20 transition-colors"
              >
                Sign Out of Portal
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Navigation Bar (App Experience) ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg flex justify-around py-2.5 z-30">
        <button
          onClick={() => {
            setActiveTab('SCAN');
            setScanStep('SCAN_QR');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'SCAN' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <QrCodeIcon className="w-6 h-6" />
          <span className="text-[11px] font-semibold">Scan & Punch</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'HISTORY' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <ClockIcon className="w-6 h-6" />
          <span className="text-[11px] font-semibold">History</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'PROFILE' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <UserCircleIcon className="w-6 h-6" />
          <span className="text-[11px] font-semibold">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default EmployeePortalPage;
