import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { hashSecret, verifySecret } from '../common/crypto';
import { TooManyRequestsError } from '../common/http-errors';
import { PrismaService } from '../prisma/prisma.service';
import { pinWeakness } from './pin';

export const PIN_MAX_FAILURES = 5;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: { include: { discipline: { select: { slug: true, nameFr: true, nameEn: true } } } },
        artistMembers: {
          include: { artist: { select: { id: true, slug: true, stageName: true, avatarUrl: true, verified: true } } },
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
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: 'DELETION_PENDING', deletionRequestedAt: now } }),
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    await this.audit.log({ actorId: userId, action: 'user.deletion_requested', entityType: 'User', entityId: userId });
    return { deletionScheduledFor: new Date(now.getTime() + 30 * 86_400_000) };
  }

  listSessions(userId: string, currentSessionId: string) {
    return this.prisma.session
      .findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { lastUsedAt: 'desc' },
        select: { id: true, deviceName: true, userAgent: true, createdAt: true, lastUsedAt: true },
      })
      .then((sessions) => sessions.map((s) => ({ ...s, current: s.id === currentSessionId })));
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Session introuvable' });
  }
}
