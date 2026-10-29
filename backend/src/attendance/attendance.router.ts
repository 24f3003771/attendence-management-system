import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { attendanceController } from './attendance.controller';
import { config } from '../config/config';

export const attendanceRouter = Router();

// Rate limiter for the scan endpoint: max 10 requests per minute per IP
const scanRateLimiter = rateLimit({
  windowMs: config.scanRateLimitWindowMs,
  max: config.scanRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many scan attempts, please try again later' },
});

// POST /api/attendance/scan — employee scans QR
attendanceRouter.post(
  '/scan',
  scanRateLimiter,
  authMiddleware,
  attendanceController.scan
);

// GET /api/attendance/today-status — employee's current status for today
attendanceRouter.get('/today-status', authMiddleware, attendanceController.todayStatus);

// GET /api/attendance/my — employee's own history
attendanceRouter.get('/my', authMiddleware, attendanceController.getMyHistory);

// GET /api/attendance — admin: all records
attendanceRouter.get('/', adminAuthMiddleware, attendanceController.getAllAdmin);

// PUT /api/attendance/:id — admin: manual correction
attendanceRouter.put('/:id', adminAuthMiddleware, attendanceController.adminCorrect);
