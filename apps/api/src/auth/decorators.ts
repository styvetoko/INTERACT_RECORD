import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Route accessible sans connexion. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route réservée à au moins un de ces rôles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export interface AuthUser {
  id: string;
  sessionId: string;
  roles: Role[];
}

/** Utilisateur connecté, injecté par le garde d'authentification. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
