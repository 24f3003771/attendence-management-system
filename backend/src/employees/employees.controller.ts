import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { employeesService } from './employees.service';

const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  employeeCode: z.string().min(1, 'Employee code is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  officeId: z.string().uuid('Invalid office ID'),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  officeId: z.string().uuid('Invalid office ID').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const paginationSchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
});

export const employeesController = {
  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const result = await employeesService.listAll(page, pageSize);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createEmployeeSchema.parse(req.body);
      const adminId = req.admin!.adminId;
      const employee = await employeesService.create(body, adminId);
      res.status(201).json({ success: true, data: employee });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = updateEmployeeSchema.parse(req.body);
      const adminId = req.admin!.adminId;
      const employee = await employeesService.update(id, body, adminId);
      res.json({ success: true, data: employee });
    } catch (error) {
      next(error);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.admin!.adminId;
      const employee = await employeesService.deactivate(id, adminId);
      res.json({ success: true, data: employee });
    } catch (error) {
      next(error);
    }
  },

  async resetDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.admin!.adminId;
      const employee = await employeesService.resetDevice(id, adminId);
      res.json({ success: true, data: employee });
    } catch (error) {
      next(error);
    }
  },
};
