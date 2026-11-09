import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { afterCursor, newestFirst, toPage } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    data?: Prisma.InputJsonValue;
  }, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        data: entry.data,
      },
    });
  }

  /** ADM-10 : consultation du journal, filtrable, du plus récent au plus ancien. */
  async list(query: { actorId?: string; entityType?: string; entityId?: string; action?: string; limit: number; cursor?: string }) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...afterCursor(query.cursor),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.action ? { action: { startsWith: query.action } } : {}),
      },
      orderBy: newestFirst,
      take: query.limit + 1,
    });
    return toPage(rows, query.limit, (r) => r);
  }
}
