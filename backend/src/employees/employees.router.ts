import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { employeesController } from './employees.controller';

export const employeesRouter = Router();

// All employee management routes require admin auth
employeesRouter.use(adminAuthMiddleware);

// GET /api/employees
employeesRouter.get('/', employeesController.listAll);

// POST /api/employees
employeesRouter.post('/', employeesController.create);

// PUT /api/employees/:id
employeesRouter.put('/:id', employeesController.update);

// DELETE /api/employees/:id  → deactivate
employeesRouter.delete('/:id', employeesController.deactivate);

// POST /api/employees/:id/reset-device
employeesRouter.post('/:id/reset-device', employeesController.resetDevice);
