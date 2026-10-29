import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  name: string;
  type: 'admin';
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    let payload: AdminJwtPayload;
    try {
      payload = jwt.verify(token, config.adminJwtSecret) as AdminJwtPayload;
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired admin token' });
      return;
    }

    if (payload.type !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied: admin token required' });
      return;
    }

    req.admin = payload;
    next();
  } catch (error) {
    next(error);
  }
}
