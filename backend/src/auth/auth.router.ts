import { Router } from 'express';
import { authController } from './auth.controller';

export const authRouter = Router();

// POST /api/auth/admin/login
authRouter.post('/admin/login', authController.adminLogin);

// POST /api/auth/employee/login
authRouter.post('/employee/login', authController.employeeLogin);
