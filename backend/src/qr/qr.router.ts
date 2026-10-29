import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { qrController } from './qr.controller';

export const qrRouter = Router();

// POST /api/qr/validate — employee validates a scanned QR token
qrRouter.post('/validate', authMiddleware, qrController.validate);
