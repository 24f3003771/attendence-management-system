import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const employeeLoginSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
});

export const authController = {
  async adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = adminLoginSchema.parse(req.body);
      const result = await authService.adminLogin(body.email, body.password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async employeeLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = employeeLoginSchema.parse(req.body);
      const result = await authService.employeeLogin(
        body.employeeCode,
        body.password,
        body.deviceId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
