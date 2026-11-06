import { prisma } from '../prisma';

export interface LogAuditParams {
  messId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  reason?: string;
  ipAddress?: string;
}

export async function logActivity(params: LogAuditParams) {
  try {
    const detailsString =
      typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details;

    return await prisma.auditLog.create({
      data: {
        messId: params.messId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: detailsString,
        reason: params.reason,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to log audit activity:', error);
    // Don't crash parent flow if audit fails
    return null;
  }
}
