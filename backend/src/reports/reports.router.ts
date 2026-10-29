import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { reportsController } from './reports.controller';

export const reportsRouter = Router();

// All reports require admin auth
reportsRouter.use(adminAuthMiddleware);

// GET /api/reports/daily?date=YYYY-MM-DD
reportsRouter.get('/daily', reportsController.daily);

// GET /api/reports/employee/:id?from=&to=
reportsRouter.get('/employee/:id', reportsController.employeePeriod);

// GET /api/reports/export?format=csv&from=&to=
reportsRouter.get('/export', reportsController.exportReport);

// GET /api/reports/photos-zip?date=YYYY-MM-DD
reportsRouter.get('/photos-zip', reportsController.downloadPhotosZip);
