import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limites de débit comptées par utilisateur connecté, et par adresse IP sinon.
 * Au Cameroun, beaucoup d'abonnés mobiles partagent la même adresse IP publique (CGNAT) :
 * compter par IP pénaliserait des artistes de bonne foi.
 * Ce garde est déclaré après le garde d'authentification, qui renseigne l'utilisateur.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return trackerFor(req);
  }
}

export function trackerFor(req: { user?: { id?: string }; ip?: string; ips?: string[] }): string {
  if (req.user?.id) return `user:${req.user.id}`;
  return `ip:${req.ips?.length ? req.ips[0] : req.ip ?? 'inconnue'}`;
}
