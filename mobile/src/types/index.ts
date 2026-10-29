// ---------------------------------------------------------------------------
// src/types/index.ts
// Shared TypeScript types for the Attendance app
// ---------------------------------------------------------------------------

export interface LoginPayload {
  employeeCode: string;
  password: string;
  deviceId: string;
}

export interface LoginResponse {
  token: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
  };
}

export interface ScanPayload {
  qrToken: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  altitude: number | null;
  provider: string;
  deviceId: string;
  isMockLocation: boolean;
  photoBase64?: string;
}

export type AttendanceType = 'IN' | 'OUT';
export type AttendanceStatus = 'SUCCESS' | 'FAILED' | 'DUPLICATE' | 'INVALID_LOCATION';

export interface ScanResponse {
  success: boolean;
  type: AttendanceType;
  time: string; // ISO string
  message: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  type: AttendanceType;
  time: string;        // HH:MM
  status: AttendanceStatus;
  latitude: number;
  longitude: number;
}

export interface HistoryResponse {
  records: AttendanceRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TodayStatus {
  signedIn: boolean;
  signedOut: boolean;
  signInTime: string | null;   // HH:MM
  signOutTime: string | null;  // HH:MM
}

/** Stack navigator params */
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Scanner: undefined;
  History: undefined;
};

export type ScannerStackParamList = {
  ScannerHome: undefined;
  Result: { scanResult: ScanResponse };
};
