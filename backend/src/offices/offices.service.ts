import { prisma } from '../app';
import { auditService } from '../audit/audit.service';
import { createHttpError } from '../middleware/errorHandler';
import { qrService } from '../qr/qr.service';

const OFFICE_SELECT = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
  radiusM: true,
  createdAt: true,
  _count: { select: { employees: true } },
} as const;

export const officesService = {
  async listAll() {
    const offices = await prisma.office.findMany({
      orderBy: { createdAt: 'desc' },
      select: OFFICE_SELECT,
    });
    return offices;
  },

  async create(
    data: { name: string; latitude: number; longitude: number; radiusM?: number },
    adminId: string
  ) {
    const office = await prisma.office.create({
      data: {
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusM: data.radiusM ?? 100,
      },
      select: OFFICE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'CREATE_OFFICE',
      target: `office:${office.id}`,
      newValue: JSON.stringify({ name: data.name, latitude: data.latitude, longitude: data.longitude }),
    });

    return office;
  },

  async update(
    id: string,
    data: { name?: string; latitude?: number; longitude?: number; radiusM?: number },
    adminId: string
  ) {
    const existing = await prisma.office.findUnique({ where: { id }, select: OFFICE_SELECT });
    if (!existing) throw createHttpError(404, 'Office not found');

    const updated = await prisma.office.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.radiusM !== undefined && { radiusM: data.radiusM }),
      },
      select: OFFICE_SELECT,
    });

    await auditService.log({
      adminId,
      action: 'UPDATE_OFFICE',
      target: `office:${id}`,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  },

  async getQrToken(officeId: string) {
    const office = await prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw createHttpError(404, 'Office not found');

    // Always generate a fresh token
    return qrService.generateForOffice(officeId);
  },
};
