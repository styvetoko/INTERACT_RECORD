import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { env } from '../config/env';
import { hashSecret, randomDigits, randomToken, sha256, verifySecret } from '../common/crypto';
import { TooManyRequestsError } from '../common/http-errors';
import { normalizePhone } from '../common/phone';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_PROVIDER, SmsProvider } from '../sms/sms.provider';

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_REQUESTS = 3;
export const OTP_REQUEST_WINDOW_SECONDS = 600;

export interface Tokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

export interface ClientInfo {
  deviceName?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  normalizeOrFail(rawPhone: string): string {
    const phone = normalizePhone(rawPhone, env().DEFAULT_COUNTRY);
    if (!phone) {
      throw new BadRequestException({ code: 'PHONE_INVALID', message: 'Numéro de téléphone invalide' });
    }
    return phone;
  }

  /** ACC-01 : envoie un code à 6 chiffres, valable 5 minutes, 3 demandes max par 10 minutes. */
  async requestOtp(rawPhone: string): Promise<{ phone: string; expiresInSeconds: number }> {
    const phone = this.normalizeOrFail(rawPhone);
    const since = new Date(Date.now() - OTP_REQUEST_WINDOW_SECONDS * 1000);
    const recent = await this.prisma.otpChallenge.count({ where: { phone, createdAt: { gte: since } } });
    if (recent >= OTP_MAX_REQUESTS) {
      throw new TooManyRequestsError('OTP_TOO_MANY_REQUESTS', 'Trop de demandes de code. Réessaie dans quelques minutes.');
    }

    const code = randomDigits(6);
    await this.prisma.$transaction([
      // Un seul code actif à la fois : les précédents sont invalidés.
      this.prisma.otpChallenge.updateMany({
        where: { phone, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpChallenge.create({
        data: {
          phone,
          codeHash: await hashSecret(code),
          expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        },
      }),
    ]);

    await this.sms.send(
      phone,
      `INTERACT Stage : ton code est ${code}. Il expire dans 5 minutes. Ne le partage avec personne.`,
    );
    return { phone, expiresInSeconds: OTP_TTL_SECONDS };
  }

  /** Vérifie le code, crée le compte au besoin et ouvre une session. */
  async verifyOtp(
    rawPhone: string,
    code: string,
    client: ClientInfo,
  ): Promise<Tokens & { user: User; isNewUser: boolean }> {
    const phone = this.normalizeOrFail(rawPhone);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw new BadRequestException({ code: 'OTP_EXPIRED', message: 'Code expiré. Demande un nouveau code.' });
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new TooManyRequestsError('OTP_TOO_MANY_ATTEMPTS', 'Trop d’essais. Demande un nouveau code.');
    }

    const ok = await verifySecret(code, challenge.codeHash);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Code incorrect' });
    }

    // Consommation atomique : un code ne sert qu'une fois, même en cas de double envoi.
    const consumed = await this.prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new BadRequestException({ code: 'OTP_EXPIRED', message: 'Code déjà utilisé. Demande un nouveau code.' });
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;
    if (!user) {
      user = await this.prisma.user.create({ data: { phone, country: env().DEFAULT_COUNTRY } });
      await this.audit.log({ actorId: user.id, action: 'user.signup', entityType: 'User', entityId: user.id });
    } else if (user.status === 'SUSPENDED') {
      throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED', message: 'Compte suspendu. Contacte le support.' });
    } else if (user.status === 'DELETION_PENDING') {
      // ACC-12 : se reconnecter pendant le délai de grâce annule la suppression.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', deletionRequestedAt: null },
      });
      await this.audit.log({ actorId: user.id, action: 'user.deletion_cancelled', entityType: 'User', entityId: user.id });
    }

    const tokens = await this.openSession(user.id, client);
    return { ...tokens, user, isNewUser };
  }

  /** Rotation du jeton de rafraîchissement ; la réutilisation d'un ancien jeton ferme toutes les sessions. */
  async refresh(refreshToken: string, client: ClientInfo): Promise<Tokens> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!session) {
      throw new UnauthorizedException({ code: 'REFRESH_INVALID', message: 'Session invalide, reconnecte-toi' });
    }
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        actorId: session.userId,
        action: 'session.refresh_token_reuse',
        entityType: 'Session',
        entityId: session.id,
      });
      throw new UnauthorizedException({ code: 'REFRESH_REUSED', message: 'Session invalide, reconnecte-toi' });
    }
    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException({ code: 'REFRESH_EXPIRED', message: 'Session expirée, reconnecte-toi' });
    }

    const revoked = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      throw new UnauthorizedException({ code: 'REFRESH_REUSED', message: 'Session invalide, reconnecte-toi' });
    }
    return this.openSession(session.userId, {
      deviceName: client.deviceName ?? session.deviceName ?? undefined,
      userAgent: client.userAgent,
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async openSession(userId: string, client: ClientInfo): Promise<Tokens> {
    const config = env();
    const refreshToken = randomToken(32);
    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        deviceName: client.deviceName?.slice(0, 100),
        userAgent: client.userAgent?.slice(0, 300),
        expiresAt: new Date(Date.now() + config.JWT_REFRESH_TTL_DAYS * 86_400_000),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: session.id },
      { expiresIn: config.JWT_ACCESS_TTL_SECONDS },
    );
    return { accessToken, accessTokenExpiresIn: config.JWT_ACCESS_TTL_SECONDS, refreshToken };
  }
}
