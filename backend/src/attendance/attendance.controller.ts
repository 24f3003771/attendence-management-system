import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { attendanceService } from './attendance.service';

const scanSchema = z.object({
  qrToken: z.string().min(1, 'QR token is required'),
  latitude: z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
  longitude: z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
  accuracyM: z.number({ required_error: 'GPS accuracy is required' }).nonnegative(),
  altitude: z.number().optional(),
  provider: z.string().optional(),
  deviceId: z.string().min(1, 'Device ID is required'),
  isMockLocation: z.boolean({ required_error: 'isMockLocation is required' }),
  photoBase64: z.string().optional(),
});

const adminCorrectSchema = z.object({
  type: z.enum(['IN', 'OUT']).optional(),
  status: z.enum(['VALID', 'FLAGGED', 'REJECTED']).optional(),
  flagReason: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
});

export const attendanceController = {
  async scan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = scanSchema.parse(req.body);
      const employeeId = req.employee!.employeeId;
      const result = await attendanceService.scan(employeeId, body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async todayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = req.employee!.employeeId;
      const result = await attendanceService.todayStatus(employeeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getMyHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const employeeId = req.employee!.employeeId;
      const result = await attendanceService.getMyHistory(employeeId, page, pageSize);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getAllAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const querySchema = z.object({
        date: z.string().optional(),
        employeeId: z.string().optional(),
        page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
        pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
      });
      const query = querySchema.parse(req.query);
      const result = await attendanceService.getAllAdmin(query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async adminCorrect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = adminCorrectSchema.parse(req.body);
      const adminId = req.admin!.adminId;
      const result = await attendanceService.adminCorrect(id, body, adminId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
