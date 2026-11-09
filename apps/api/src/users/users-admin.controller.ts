import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { PageQuerySchema } from '../common/pagination';
import { parse, UuidParam } from '../common/validation';
import { INTERNAL_ROLES, UsersService } from './users.service';

const SearchSchema = PageQuerySchema.extend({
  q: z.string().trim().min(1).max(60).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(Role).optional(),
});
const ReasonSchema = z.object({ reason: z.string().trim().min(5, 'motif de 5 caractères minimum').max(500) });
const RolesSchema = ReasonSchema.extend({ roles: z.array(z.enum(INTERNAL_ROLES)).max(INTERNAL_ROLES.length) });

/** Back-office : gestion des comptes (ADM-01). Chaque action écrit dans le journal d'audit avec son motif. */
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly users: UsersService) {}

  /** Recherche réservée aux administrateurs et au support (critère J2) ; limitée contre l'aspiration de la base. */
  @Roles('ADMIN', 'SUPPORT')
  @Throttle({ default: { limit: 60, ttl: 60 * 60_000 } })
  @Get()
  search(@CurrentUser() actor: AuthUser, @Query() query: unknown) {
    return this.users.adminSearch(actor.id, parse(SearchSchema, query));
  }

  /** Fiche d'un compte (le modérateur y accède depuis un signalement) ; chaque consultation est tracée. */
  @Roles('ADMIN', 'SUPPORT', 'MODERATOR')
  @Get(':id')
  get(@CurrentUser() actor: AuthUser, @Param('id', UuidParam) id: string) {
    return this.users.adminView(actor.id, id);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Post(':id/suspend')
  @HttpCode(200)
  suspend(@CurrentUser() actor: AuthUser, @Param('id', UuidParam) id: string, @Body() body: unknown) {
    return this.users.adminSuspend(actor, id, parse(ReasonSchema, body).reason);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Post(':id/reactivate')
  @HttpCode(200)
  reactivate(@CurrentUser() actor: AuthUser, @Param('id', UuidParam) id: string, @Body() body: unknown) {
    return this.users.adminReactivate(actor, id, parse(ReasonSchema, body).reason);
  }

  @Roles('ADMIN')
  @Put(':id/roles')
  roles(@CurrentUser() actor: AuthUser, @Param('id', UuidParam) id: string, @Body() body: unknown) {
    const dto = parse(RolesSchema, body);
    return this.users.adminSetInternalRoles(actor.id, id, dto.roles, dto.reason);
  }
}
