// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: {
    id: string;
    email: string;
    name: string;
  };
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  officeId: string;
  officeName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  deviceBound: boolean;
  createdAt: string;
}

export interface CreateEmployeePayload {
  employeeCode: string;
  name: string;
  email: string;
  officeId: string;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string;
  officeId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateEmployeeResponse {
  employee: Employee;
  generatedPassword: string;
}

// ─── Office ───────────────────────────────────────────────────────────────────

export interface Office {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  createdAt: string;
}

export interface CreateOfficePayload {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface UpdateOfficePayload {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export interface QRData {
  token: string;
  officeId: string;
  expiresAt: string;
}

export interface QRResponse {
  qrData: QRData;
  officeName: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceType = 'IN' | 'OUT';
export type AttendanceStatus = 'VALID' | 'FLAGGED' | 'REJECTED';
export type EmployeeAttendanceStatus = 'SIGNED_IN' | 'ABSENT' | 'INCOMPLETE' | 'COMPLETE';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  officeId: string;
  officeName: string;
  type: AttendanceType;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceId: string;
  status: AttendanceStatus;
  photoUrl?: string | null;
  flagReason?: string;
  correctedTime?: string;
  correctionReason?: string;
  correctedBy?: string;
}

export interface AttendanceCorrectionPayload {
  correctedTime: string;
  correctionReason: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  signedInToday: number;
  absent: number;
  incomplete: number;
}

export interface DashboardEmployee {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  officeName: string;
  status: EmployeeAttendanceStatus;
  signInTime?: string;
  signOutTime?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  employees: DashboardEmployee[];
  date: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  officeName: string;
  daysPresent: number;
  daysAbsent: number;
  daysIncomplete: number;
  totalDays: number;
}

export interface ReportResponse {
  from: string;
  to: string;
  rows: ReportRow[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

