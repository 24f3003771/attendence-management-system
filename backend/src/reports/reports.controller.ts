import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reportsService } from './reports.service';

export const reportsController = {
  async daily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const querySchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
      });
      const { date } = querySchema.parse(req.query);
      const result = await reportsService.daily(date);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async employeePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const querySchema = z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
      });
      const { from, to } = querySchema.parse(req.query);
      const { id } = req.params;
      const result = await reportsService.employeePeriod(id, from, to);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const querySchema = z.object({
        format: z.enum(['csv', 'json']).default('json'),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
      });
      const { format, from, to } = querySchema.parse(req.query);
      const result = await reportsService.export(format, from, to);

      if (format === 'csv' && 'csv' in result) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance_${from}_to_${to}.csv"`
        );
        res.send(result.csv);
        return;
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async downloadPhotosZip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const querySchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
      });
      const { date } = querySchema.parse(req.query);
      await reportsService.streamPhotosZip(date, res);
    } catch (error) {
      next(error);
    }
  },
};
