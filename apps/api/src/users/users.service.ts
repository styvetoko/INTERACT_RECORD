import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale, Prisma, Role, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { afterCursor, newestFirst, toPage } from '../common/pagination';
import { normalizePhone } from '../common/phone';
import { env } from '../config/env';
import { hashSecret, verifySecret } from '../common/crypto';
import { TooManyRequestsError } from '../common/http-errors';
import { PrismaService } from '../prisma/prisma.service';
import { pinWeakness } from './pin';

export const PIN_MAX_FAILURES = 5;

/** Rôles de l'équipe INTERACT Stage, attribués depuis le back-office. FAN et ARTIST ne s'attribuent pas à la main. */
export const INTERNAL_ROLES = ['ADMIN', 'MODERATOR', 'FINANCE', 'SUPPORT', 'EDITOR'] as const satisfies readonly Role[];
export type InternalRole = (typeof INTERNAL_ROLES)[number];
const isInternal = (r: Role): r is InternalRole => (INTERNAL_ROLES as readonly Role[]).includes(r);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: { include: { discipline: { select: { slug: true, nameFr: true, nameEn: true } } } },
        artistMembers: {
          include: { artist: { select: { id: true, slug: true, stageName: true, verified: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' });
    return user;
  }

  async updateMe(userId: string, input: { displayName?: string; email?: string | null; locale?: Locale; city?: string; birthYear?: number }) {
    if (input.email) {
      const taken = await this.prisma.user.findFirst({ where: { email: input.email, NOT: { id: userId } } });
      if (taken) throw new BadRequestException({ code: 'EMAIL_TAKEN', message: 'Cette adresse e-mail est déjà utilisée' });
    }
    return this.prisma.user.update({ where: { id: userId }, data: input });
  }

  async setPin(userId: string, pin: string, currentPin?: string): Promise<void> {
    const weakness = pinWeakness(pin);
    if (weakness) throw new BadRequestException({ code: 'PIN_WEAK', message: weakness });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.pinHash) {
      if (!currentPin || !(await verifySecret(currentPin, user.pinHash))) {
        throw new ForbiddenException({ code: 'PIN_INVALID', message: 'Code PIN actuel incorrect' });
      }
    }
    await this.prisma.user.update({ where: { id: userId }, data: { pinHash: await hashSecret(pin) } });
    await this.audit.log({ actorId: userId, action: user.pinHash ? 'pin.change' : 'pin.set', entityType: 'User', entityId: userId });
  }

  /**
   * Vérifie le PIN avant un paiement ou un retrait (utilisé à partir du J5).
   * Après 5 échecs en 15 minutes, les vérifications sont bloquées.
   */
  async verifyPin(userId: string, pin: string): Promise<void> {
    const since = new Date(Date.now() - 15 * 60_000);
    const failures = await this.prisma.auditLog.count({
      where: { actorId: userId, action: 'pin.failure', createdAt: { gte: since } },
    });
    if (failures >= PIN_MAX_FAILURES) {
      throw new TooManyRequestsError('PIN_LOCKED', 'Trop d’essais. Réessaie dans 15 minutes.');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.pinHash) throw new BadRequestException({ code: 'PIN_NOT_SET', message: 'Crée d’abord ton code PIN' });
    if (!(await verifySecret(pin, user.pinHash))) {
      await this.audit.log({ actorId: userId, action: 'pin.failure', entityType: 'User', entityId: userId });
      throw new ForbiddenException({ code: 'PIN_INVALID', message: 'Code PIN incorrect' });
    }
  }

  /** ACC-03 : centres d'intérêt choisis au premier lancement. */
  async setInterests(userId: string, disciplineSlugs: string[]) {
    const disciplines = await this.prisma.discipline.findMany({ where: { slug: { in: disciplineSlugs }, enabled: true } });
    if (disciplines.length !== new Set(disciplineSlugs).size) {
      throw new BadRequestException({ code: 'DISCIPLINE_UNKNOWN', message: 'Discipline inconnue ou indisponible' });
    }
    await this.prisma.$transaction([
      this.prisma.userInterest.deleteMany({ where: { userId } }),
      this.prisma.userInterest.createMany({ data: disciplines.map((d) => ({ userId, disciplineId: d.id })) }),
    ]);
    return disciplines.map((d) => d.slug);
  }

  /** ACC-12 : demande de suppression avec 30 jours de grâce. Les sessions sont fermées. */
  async requestDeletion(userId: string) {
    const now = new Date();
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'DELETION_PENDING', deletionRequestedAt: now } });
    await this.auth.revokeAllSessions(userId);
    await this.audit.log({ actorId: userId, action: 'user.deletion_requested', entityType: 'User', entityId: userId });
    return { deletionScheduledFor: new Date(now.getTime() + 30 * 86_400_000) };
  }

  listSessions(userId: string, currentSessionId: string) {
    return this.auth.listSessions(userId, currentSessionId);
  }

  async revokeSession(userId: string, sessionId: string) {
    if (!(await this.auth.revokeSession(userId, sessionId))) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Session introuvable' });
    }
  }

  // ---------- Back-office (ADM-01) ----------

  /** Recherche par numéro (exact) ou par nom ; filtres statut et rôle ; pagination par curseur. */
  async adminSearch(query: { q?: string; status?: UserStatus; role?: Role; limit: number; cursor?: string }) {
    let qFilter: Prisma.UserWhereInput = {};
    if (query.q) {
      const phone = normalizePhone(query.q, env().DEFAULT_COUNTRY);
      qFilter = phone ? { phone } : { displayName: { contains: query.q, mode: 'insensitive' } };
    }
    const rows = await this.prisma.user.findMany({
      where: {
        ...afterCursor(query.cursor),
        ...qFilter,
        ...(query.status ? { status: query.status } : {}),
        ...(query.role ? { roles: { has: query.role } } : {}),
      },
      orderBy: newestFirst,
      take: query.limit + 1,
    });
    return toPage(rows, query.limit, (u) => ({
      id: u.id,
      phone: u.phone,
      displayName: u.displayName,
      city: u.city,
      roles: u.roles,
      status: u.status,
      kycLevel: u.kycLevel,
      createdAt: u.createdAt,
    }));
  }

  async adminGet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artistMembers: { include: { artist: { select: { slug: true, stageName: true, verified: true } } } } },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' });
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      locale: user.locale,
      country: user.country,
      city: user.city,
      roles: user.roles,
      status: user.status,
      suspendedReason: user.suspendedReason,
      kycLevel: user.kycLevel,
      hasPin: user.pinHash !== null,
      deletionRequestedAt: user.deletionRequestedAt,
      activeSessions: await this.auth.countActiveSessions(user.id),
      artists: user.artistMembers.map((m) => ({ ...m.artist, memberRole: m.role })),
      createdAt: user.createdAt,
    };
  }

  /** Suspension : motif obligatoire, sessions fermées. Personne ne se suspend soi-même ; seul un admin suspend un membre de l'équipe. */
  async adminSuspend(actor: { id: string; roles: Role[] }, userId: string, reason: string) {
    if (actor.id === userId) {
      throw new ForbiddenException({ code: 'CANNOT_SUSPEND_SELF', message: 'Tu ne peux pas suspendre ton propre compte' });
    }
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' });
    if (target.roles.some(isInternal) && !actor.roles.includes('ADMIN')) {
      throw new ForbiddenException({ code: 'CANNOT_SUSPEND_STAFF', message: 'Seul un administrateur peut suspendre un membre de l’équipe' });
    }
    if (target.status === 'SUSPENDED') {
      throw new BadRequestException({ code: 'ALREADY_SUSPENDED', message: 'Ce compte est déjà suspendu' });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED', suspendedReason: reason } });
    const closed = await this.auth.revokeAllSessions(userId);
    await this.audit.log({ actorId: actor.id, action: 'user.suspend', entityType: 'User', entityId: userId, data: { reason, closedSessions: closed } });
    return this.adminGet(userId);
  }

  async adminReactivate(actorId: string, userId: string, reason: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' });
    if (target.status !== 'SUSPENDED') {
      throw new BadRequestException({ code: 'NOT_SUSPENDED', message: 'Ce compte n’est pas suspendu' });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE', suspendedReason: null } });
    await this.audit.log({ actorId, action: 'user.reactivate', entityType: 'User', entityId: userId, data: { reason } });
    return this.adminGet(userId);
  }

  /** Remplace les rôles internes d'un utilisateur ; FAN et ARTIST sont conservés tels quels. */
  async adminSetInternalRoles(actorId: string, userId: string, roles: InternalRole[], reason: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' });
    const wanted = [...new Set(roles)];
    if (actorId === userId && !wanted.includes('ADMIN')) {
      throw new ForbiddenException({ code: 'CANNOT_REMOVE_OWN_ADMIN', message: 'Tu ne peux pas retirer ton propre rôle d’administrateur' });
    }
    const kept = target.roles.filter((r) => !isInternal(r));
    const next = [...kept, ...wanted];
    await this.prisma.user.update({ where: { id: userId }, data: { roles: next } });
    await this.audit.log({
      actorId,
      action: 'user.roles',
      entityType: 'User',
      entityId: userId,
      data: { before: target.roles, after: next, reason },
    });
    return this.adminGet(userId);
  }
}
