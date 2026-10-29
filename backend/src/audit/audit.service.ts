import { prisma } from '../app';

export interface CreateAuditLogParams {
  adminId: string;
  action: string;
  target: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export const auditService = {
  async log(params: CreateAuditLogParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        target: params.target,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
      },
    });
  },

  async getAll(page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: pageSize,
        orderBy: { time: 'desc' },
        include: { admin: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    return { logs, total, page, pageSize };
  },
};
