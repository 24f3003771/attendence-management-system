import bcrypt from 'bcrypt';
import { prisma } from '../app';
import { config } from '../config/config';
import { auditService } from '../audit/audit.service';
import { createHttpError } from '../middleware/errorHandler';

const EMPLOYEE_SELECT = {
  id: true,
  employeeCode: true,
  name: true,
  officeId: true,
  deviceId: true,
  status: true,
  createdAt: true,
  createdById: true,
  office: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export const employeesService = {
  async listAll(page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: EMPLOYEE_SELECT,
      }),
      prisma.employee.count(),
    ]);
    return { employees, total, page, pageSize };
  },

  async create(
    data: { name: string; employeeCode: string; password: string; officeId: string },
    adminId: string
  ) {
    // Verify office exists
    const office = await prisma.office.findUnique({ where: { id: data.officeId } });
    if (!office) throw createHttpError(404, 'Office not found');

    // Verify unique employeeCode
    const existing = await prisma.employee.findUnique({ where: { employeeCode: data.employeeCode } });
    if (existing) throw createHttpError(409, `Employee code "${data.employeeCode}" already exists`);

    const passwordHash = await bcrypt.hash(data.password, config.bcryptSaltRounds);

    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        employeeCode: data.employeeCode,
        passwordHash,
        officeId: data.officeId,
        createdById: adminId,
      },
      select: EMPLOYEE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'CREATE_EMPLOYEE',
      target: `employee:${employee.id}`,
      newValue: JSON.stringify({ name: data.name, employeeCode: data.employeeCode, officeId: data.officeId }),
    });

    return employee;
  },

  async update(
    id: string,
    data: { name?: string; officeId?: string; status?: 'ACTIVE' | 'INACTIVE' },
    adminId: string
  ) {
    const existing = await prisma.employee.findUnique({ where: { id }, select: EMPLOYEE_SELECT });
    if (!existing) throw createHttpError(404, 'Employee not found');

    if (data.officeId) {
      const office = await prisma.office.findUnique({ where: { id: data.officeId } });
      if (!office) throw createHttpError(404, 'Office not found');
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.officeId !== undefined && { officeId: data.officeId }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: EMPLOYEE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'UPDATE_EMPLOYEE',
      target: `employee:${id}`,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  },

  async deactivate(id: string, adminId: string) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw createHttpError(404, 'Employee not found');

    const updated = await prisma.employee.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: EMPLOYEE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'DEACTIVATE_EMPLOYEE',
      target: `employee:${id}`,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status: 'INACTIVE' }),
    });

    return updated;
  },

  async resetDevice(id: string, adminId: string) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw createHttpError(404, 'Employee not found');

    const updated = await prisma.employee.update({
      where: { id },
      data: { deviceId: null },
      select: EMPLOYEE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'RESET_DEVICE',
      target: `employee:${id}`,
      oldValue: JSON.stringify({ deviceId: existing.deviceId }),
      newValue: JSON.stringify({ deviceId: null }),
    });

    return updated;
  },
};
