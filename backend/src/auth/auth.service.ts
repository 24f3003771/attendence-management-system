import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { config } from '../config/config';
import { createHttpError } from '../middleware/errorHandler';

export const authService = {
  /**
   * Admin login – validates email + password, returns signed JWT
   */
  async adminLogin(email: string, password: string): Promise<{ token: string; admin: { id: string; email: string; name: string } }> {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw createHttpError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw createHttpError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, name: admin.name, type: 'admin' },
      config.adminJwtSecret,
      { expiresIn: config.adminJwtExpiry as any }
    );

    return {
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  },

  /**
   * Employee login – validates employeeCode + password, binds deviceId on first login
   */
  async employeeLogin(
    employeeCode: string,
    password: string,
    deviceId: string
  ): Promise<{ token: string; employee: { id: string; employeeCode: string; name: string; officeId: string } }> {
    const employee = await prisma.employee.findUnique({ where: { employeeCode } });

    if (!employee) {
      throw createHttpError(401, 'Invalid credentials');
    }

    if (employee.status === 'INACTIVE') {
      throw createHttpError(403, 'Employee account is inactive');
    }

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) {
      throw createHttpError(401, 'Invalid credentials');
    }

    // Device binding logic
    if (employee.deviceId === null) {
      // First login — bind the device
      await prisma.employee.update({
        where: { id: employee.id },
        data: { deviceId },
      });
    } else if (employee.deviceId !== deviceId) {
      throw createHttpError(
        403,
        'Device not recognized. Contact your administrator to reset your device binding.'
      );
    }

    const token = jwt.sign(
      {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        officeId: employee.officeId,
        deviceId,
        type: 'employee',
      },
      config.jwtSecret,
      { expiresIn: config.employeeJwtExpiry as any }
    );

    return {
      token,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        officeId: employee.officeId,
      },
    };
  },
};
