import { prisma } from '../app';
import { auditService } from '../audit/audit.service';
import { qrService } from '../qr/qr.service';
import { haversineDistance } from './geofence';
import { photoService } from './photo.service';
import { config } from '../config/config';
import { createHttpError } from '../middleware/errorHandler';
import { AttendanceStatus, AttendanceType } from '@prisma/client';

export interface ScanPayload {
  qrToken: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  altitude?: number;
  provider?: string;
  deviceId: string;
  isMockLocation: boolean;
  photoBase64?: string;
}

const ATTENDANCE_SELECT = {
  id: true,
  employeeId: true,
  type: true,
  serverTime: true,
  latitude: true,
  longitude: true,
  accuracyM: true,
  altitude: true,
  provider: true,
  deviceId: true,
  qrTokenId: true,
  photoUrl: true,
  status: true,
  flagReason: true,
  employee: { select: { id: true, name: true, employeeCode: true } },
} as const;

export const attendanceService = {
  /**
   * Main scan endpoint logic — all validation + IN/OUT determination
   */
  async scan(employeeId: string, payload: ScanPayload) {
    // 1. Reject mock location — flag employee account
    if (payload.isMockLocation) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { status: 'INACTIVE' },
      });
      // Still create a REJECTED+FLAGGED record for audit trail
      // But first we need a QR token — validate it to get office info
      // We do a best-effort token lookup without throwing on expiry
      const qrRecord = await prisma.qrToken.findUnique({ where: { token: payload.qrToken } });
      if (qrRecord) {
        await prisma.attendance.create({
          data: {
            employeeId,
            type: 'IN',
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracyM: payload.accuracyM,
            altitude: payload.altitude,
            provider: payload.provider,
            deviceId: payload.deviceId,
            qrTokenId: qrRecord.id,
            status: 'FLAGGED',
            flagReason: 'Mock location detected',
          },
        });
      }
      throw createHttpError(403, 'Mock location detected. Account has been flagged.');
    }

    // 2. Validate QR token (checks expiry + HMAC signature)
    const qrRecord = await qrService.validateToken(payload.qrToken);

    // 3. Fetch employee + office
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { office: true },
    });
    if (!employee) throw createHttpError(404, 'Employee not found');
    if (employee.status === 'INACTIVE') throw createHttpError(403, 'Employee account is inactive');

    // 4. QR token must belong to the employee's office
    if (qrRecord.officeId !== employee.officeId) {
      throw createHttpError(400, 'QR code does not belong to your office');
    }

    // 5. Verify device ID matches
    if (employee.deviceId && employee.deviceId !== payload.deviceId) {
      throw createHttpError(403, 'Device mismatch');
    }

    // 6. GPS accuracy check
    if (payload.accuracyM > config.maxGpsAccuracyM) {
      throw createHttpError(400, `GPS accuracy too low (${payload.accuracyM}m > ${config.maxGpsAccuracyM}m threshold)`);
    }

    // 7. Geofence check
    const office = employee.office;
    const distance = haversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );
    if (distance > office.radiusM) {
      throw createHttpError(
        400,
        `Outside geofence: ${Math.round(distance)}m from office (max ${office.radiusM}m)`
      );
    }

    // 8. Determine today's attendance window (midnight to now in UTC)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    // 9. Fetch last attendance record for today
    const lastRecord = await prisma.attendance.findFirst({
      where: {
        employeeId,
        serverTime: { gte: todayStart },
        status: { not: 'REJECTED' },
      },
      orderBy: { serverTime: 'desc' },
    });

    // 10. Cooldown check — block scans within 5 minutes of previous scan
    if (lastRecord) {
      const minutesSinceLast = (now.getTime() - lastRecord.serverTime.getTime()) / 60_000;
      if (minutesSinceLast < config.scanCooldownMinutes) {
        throw createHttpError(
          429,
          `Please wait ${Math.ceil(config.scanCooldownMinutes - minutesSinceLast)} more minute(s) before scanning again`
        );
      }
    }

    // 11. Determine IN or OUT
    let type: AttendanceType;
    if (!lastRecord) {
      type = 'IN';
    } else if (lastRecord.type === 'IN') {
      type = 'OUT';
    } else {
      // lastRecord.type === 'OUT'
      throw createHttpError(400, 'Already signed out today');
    }

    // 12. Process & watermark attendance photo if uploaded
    let photoUrl: string | null = null;
    if (payload.photoBase64) {
      try {
        photoUrl = await photoService.processAndSavePhoto(payload.photoBase64, {
          employeeName: employee.name,
          employeeCode: employee.employeeCode,
          type,
          serverTime: now,
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracyM: payload.accuracyM,
          officeName: office.name,
        });
      } catch (err) {
        console.error('Failed to process and watermark attendance photo:', err);
      }
    }

    // 13. Create attendance record (use server time)
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        type,
        serverTime: now,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracyM: payload.accuracyM,
        altitude: payload.altitude,
        provider: payload.provider,
        deviceId: payload.deviceId,
        qrTokenId: qrRecord.id,
        photoUrl,
        status: 'VALID',
      },
      select: ATTENDANCE_SELECT,
    });

    // 13. Mark QR token as used
    await qrService.markUsed(qrRecord.id);

    return {
      type,
      serverTime: now.toISOString(),
      status: 'VALID' as AttendanceStatus,
      message: type === 'IN' ? 'Signed in successfully' : 'Signed out successfully',
      attendance,
    };
  },

  /**
   * Today's sign-in/sign-out status for the authenticated employee
   */
  async todayStatus(employeeId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        serverTime: { gte: todayStart },
        status: { not: 'REJECTED' },
      },
      orderBy: { serverTime: 'asc' },
      select: { type: true, serverTime: true },
    });

    let status: 'NONE' | 'SIGNED_IN' | 'SIGNED_OUT' = 'NONE';
    let signInTime: string | null = null;
    let signOutTime: string | null = null;

    for (const r of records) {
      if (r.type === 'IN') {
        status = 'SIGNED_IN';
        signInTime = r.serverTime.toISOString();
      } else if (r.type === 'OUT') {
        status = 'SIGNED_OUT';
        signOutTime = r.serverTime.toISOString();
      }
    }

    return { status, signInTime, signOutTime };
  },

  /**
   * Employee's own attendance history (paginated)
   */
  async getMyHistory(employeeId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where: { employeeId },
        skip,
        take: pageSize,
        orderBy: { serverTime: 'desc' },
        select: ATTENDANCE_SELECT,
      }),
      prisma.attendance.count({ where: { employeeId } }),
    ]);
    return { records, total, page, pageSize };
  },

  /**
   * Admin: all attendance records with optional date/employee filters
   */
  async getAllAdmin(filters: {
    date?: string;
    employeeId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.date) {
      const dayStart = new Date(filters.date + 'T00:00:00.000Z');
      const dayEnd = new Date(filters.date + 'T23:59:59.999Z');
      where.serverTime = { gte: dayStart, lte: dayEnd };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { serverTime: 'desc' },
        select: ATTENDANCE_SELECT,
      }),
      prisma.attendance.count({ where }),
    ]);

    return { records, total, page, pageSize };
  },

  /**
   * Admin: manual correction of an attendance record
   */
  async adminCorrect(
    id: string,
    data: {
      type?: AttendanceType;
      status?: AttendanceStatus;
      flagReason?: string;
    },
    adminId: string
  ) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
      select: ATTENDANCE_SELECT,
    });
    if (!existing) throw createHttpError(404, 'Attendance record not found');

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.flagReason !== undefined && { flagReason: data.flagReason }),
      },
      select: ATTENDANCE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'CORRECT_ATTENDANCE',
      target: `attendance:${id}`,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  },
};
