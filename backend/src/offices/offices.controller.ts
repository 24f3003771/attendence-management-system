import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { officesService } from './offices.service';

const createOfficeSchema = z.object({
  name: z.string().min(1, 'Office name is required'),
  latitude: z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
  longitude: z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
  radiusM: z.number().int().positive().optional(),
});

const updateOfficeSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusM: z.number().int().positive().optional(),
});

export const officesController = {
  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offices = await officesService.listAll();
      res.json({ success: true, data: offices });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createOfficeSchema.parse(req.body);
      const adminId = req.admin!.adminId;
      const office = await officesService.create(body, adminId);
      res.status(201).json({ success: true, data: office });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = updateOfficeSchema.parse(req.body);
      const adminId = req.admin!.adminId;
      const office = await officesService.update(id, body, adminId);
      res.json({ success: true, data: office });
    } catch (error) {
      next(error);
    }
  },

  async getQrToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await officesService.getQrToken(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
