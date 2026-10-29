import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';

import { authRouter } from './auth/auth.router';
import { employeesRouter } from './employees/employees.router';
import { officesRouter } from './offices/offices.router';
import { qrRouter } from './qr/qr.router';
import { attendanceRouter } from './attendance/attendance.router';
import { reportsRouter } from './reports/reports.router';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static files for attendance photos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/offices', officesRouter);
app.use('/api/qr', qrRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/reports', reportsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
