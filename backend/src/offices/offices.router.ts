import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { officesController } from './offices.controller';

export const officesRouter = Router();

// All office management routes require admin auth
officesRouter.use(adminAuthMiddleware);

// GET /api/offices
officesRouter.get('/', officesController.listAll);

// POST /api/offices
officesRouter.post('/', officesController.create);

// PUT /api/offices/:id
officesRouter.put('/:id', officesController.update);

// GET /api/offices/:id/qr — returns a fresh QR token for the display screen
officesRouter.get('/:id/qr', officesController.getQrToken);
