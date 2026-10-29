import { prisma } from '../app';
import { createHttpError } from '../middleware/errorHandler';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Response } from 'express';

/**
 * Convert a list of records to CSV string
 */
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          // Escape commas and quotes
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    ),
  ];
  return csvLines.join('\r\n');
}

export const reportsService = {
  /**
   * Daily report: who signed in and who didn't for a given date
   */
  async daily(date: string) {
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    if (isNaN(dayStart.getTime())) {
      throw createHttpError(400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const [allEmployees, attendanceRecords] = await Promise.all([
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          office: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.attendance.findMany({
        where: {
          serverTime: { gte: dayStart, lte: dayEnd },
          status: { not: 'REJECTED' },
        },
        select: {
          employeeId: true,
          type: true,
          serverTime: true,
          status: true,
        },
        orderBy: { serverTime: 'asc' },
      }),
    ]);

    // Group attendance by employee
    const attendanceByEmployee = new Map<
      string,
      { signedIn: boolean; signedOut: boolean; signInTime?: Date; signOutTime?: Date }
    >();

    for (const record of attendanceRecords) {
      if (!attendanceByEmployee.has(record.employeeId)) {
        attendanceByEmployee.set(record.employeeId, { signedIn: false, signedOut: false });
      }
      const entry = attendanceByEmployee.get(record.employeeId)!;
      if (record.type === 'IN') {
        entry.signedIn = true;
        entry.signInTime = record.serverTime;
      } else if (record.type === 'OUT') {
        entry.signedOut = true;
        entry.signOutTime = record.serverTime;
      }
    }

    const present = allEmployees
      .filter((e) => attendanceByEmployee.get(e.id)?.signedIn)
      .map((e) => {
        const att = attendanceByEmployee.get(e.id)!;
        return {
          ...e,
          signInTime: att.signInTime ?? null,
          signedOut: att.signedOut,
          signOutTime: att.signOutTime ?? null,
        };
      });

    const absent = allEmployees.filter((e) => !attendanceByEmployee.get(e.id)?.signedIn);

    return { date, present, absent, presentCount: present.length, absentCount: absent.length };
  },

  /**
   * Employee period report: all attendance records for an employee between from and to
   */
  async employeePeriod(employeeId: string, from: string, to: string) {
    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T23:59:59.999Z');

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw createHttpError(400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        status: true,
        office: { select: { id: true, name: true } },
      },
    });

    if (!employee) throw createHttpError(404, 'Employee not found');

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        serverTime: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        type: true,
        serverTime: true,
        latitude: true,
        longitude: true,
        accuracyM: true,
        deviceId: true,
        status: true,
        flagReason: true,
      },
      orderBy: { serverTime: 'asc' },
    });

    // Summarize working days
    const dayMap = new Map<string, { in?: Date; out?: Date }>();
    for (const r of records) {
      if (r.status === 'REJECTED') continue;
      const day = r.serverTime.toISOString().slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, {});
      const entry = dayMap.get(day)!;
      if (r.type === 'IN') entry.in = r.serverTime;
      else if (r.type === 'OUT') entry.out = r.serverTime;
    }

    const summary = Array.from(dayMap.entries()).map(([day, val]) => ({
      date: day,
      signInTime: val.in ?? null,
      signOutTime: val.out ?? null,
      workedMinutes:
        val.in && val.out
          ? Math.round((val.out.getTime() - val.in.getTime()) / 60_000)
          : null,
    }));

    return { employee, from, to, records, summary };
  },

  /**
   * Export all attendance records within a date range as CSV or JSON
   */
  async export(format: 'csv' | 'json', from: string, to: string) {
    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T23:59:59.999Z');

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw createHttpError(400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const records = await prisma.attendance.findMany({
      where: { serverTime: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        type: true,
        serverTime: true,
        latitude: true,
        longitude: true,
        accuracyM: true,
        altitude: true,
        provider: true,
        deviceId: true,
        status: true,
        flagReason: true,
        employee: { select: { employeeCode: true, name: true } },
      },
      orderBy: { serverTime: 'asc' },
    });

    if (format === 'json') {
      return { format: 'json', records };
    }

    // Flatten for CSV
    const flat = records.map((r) => ({
      id: r.id,
      employeeCode: r.employee.employeeCode,
      employeeName: r.employee.name,
      type: r.type,
      serverTime: r.serverTime.toISOString(),
      latitude: r.latitude,
      longitude: r.longitude,
      accuracyM: r.accuracyM,
      altitude: r.altitude ?? '',
      provider: r.provider ?? '',
      deviceId: r.deviceId,
      status: r.status,
      flagReason: r.flagReason ?? '',
    }));

    return { format: 'csv', csv: toCSV(flat as Record<string, unknown>[]), count: flat.length };
  },

  /**
   * Package all photos for a specific date into a ZIP file and stream to response
   */
  async streamPhotosZip(date: string, res: Response): Promise<void> {
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    if (isNaN(dayStart.getTime())) {
      throw createHttpError(400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const records = await prisma.attendance.findMany({
      where: {
        serverTime: { gte: dayStart, lte: dayEnd },
        photoUrl: { not: null },
      },
      include: {
        employee: { select: { name: true, employeeCode: true } },
      },
      orderBy: { serverTime: 'asc' },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-photos-${date}.zip"`);

    const archive = (archiver as any)('zip', { zlib: { level: 9 } });

    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to create zip archive' });
      }
    });

    archive.pipe(res);

    for (const record of records) {
      if (!record.photoUrl) continue;
      const relPath = record.photoUrl.replace(/^\//, '');
      const filePath = path.join(process.cwd(), relPath);

      if (fs.existsSync(filePath)) {
        const entryName = path.basename(filePath);
        archive.file(filePath, { name: entryName });
      }
    }

    await archive.finalize();
  },
};
