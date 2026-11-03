import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, IS_PUBLIC, ROLES } from './decorators';

interface AccessPayload {
  sub: string;
  sid: string;
}

/**
 * Garde global : toute route exige un jeton valide, sauf celles marquées @Public().
 * Le statut et les rôles sont relus en base pour qu'une suspension ou un nouveau rôle s'applique tout de suite.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Connexion requise' });
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Session expirée, reconnecte-toi' });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: { revokedAt: true, user: { select: { id: true, roles: true, status: true } } },
    });
    if (!session || session.revokedAt || session.user.id !== payload.sub) {
      throw new UnauthorizedException({ code: 'SESSION_REVOKED', message: 'Session fermée, reconnecte-toi' });
    }
    if (session.user.status === 'SUSPENDED') {
      throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED', message: 'Compte suspendu' });
    }

    const user: AuthUser = { id: session.user.id, sessionId: payload.sid, roles: session.user.roles };
    request.user = user;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (required?.length && !required.some((r) => user.roles.includes(r))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    return true;
  }
}
