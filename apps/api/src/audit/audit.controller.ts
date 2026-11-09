import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../auth/decorators';
import { PageQuerySchema } from '../common/pagination';
import { parse } from '../common/validation';
import { AuditService } from './audit.service';

const AuditQuerySchema = PageQuerySchema.extend({
  actorId: z.string().uuid().optional(),
  entityType: z.string().max(40).optional(),
  entityId: z.string().max(80).optional(),
  action: z.string().max(60).optional(),
});

@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('ADMIN')
  @Get()
  list(@Query() query: unknown) {
    return this.audit.list(parse(AuditQuerySchema, query));
  }
}
