import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { prisma } from '../app';

export interface EmployeeJwtPayload {
  employeeId: string;
  employeeCode: string;
  officeId: string;
  deviceId: string;
  type: 'employee';
}

declare global {
  namespace Express {
    interface Request {
      employee?: EmployeeJwtPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    let payload: EmployeeJwtPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret) as EmployeeJwtPayload;
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    if (payload.type !== 'employee') {
      res.status(403).json({ success: false, error: 'Access denied: employee token required' });
      return;
    }

    // Verify employee still exists and is active
    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
    });

    if (!employee) {
      res.status(401).json({ success: false, error: 'Employee not found' });
      return;
    }

    if (employee.status === 'INACTIVE') {
      res.status(403).json({ success: false, error: 'Employee account is inactive' });
      return;
    }

    // Device binding check: verify deviceId in token matches stored deviceId
    if (employee.deviceId && employee.deviceId !== payload.deviceId) {
      res
        .status(403)
        .json({ success: false, error: 'Device mismatch: please login again from your registered device' });
      return;
    }

    req.employee = payload;
    next();
  } catch (error) {
    next(error);
  }
}
