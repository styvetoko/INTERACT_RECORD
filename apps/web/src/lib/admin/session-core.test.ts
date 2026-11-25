import { describe, expect, it, vi } from 'vitest';
import {
  absoluteUrl, ADMIN_PATH, classifyRefresh, cookieOptions, createRefreshDeduper, jwtExpiresAt, needsRefresh, safeAdminPath,
  type RefreshResult, type TokenPair,
} from './session-core';

/** Jeton au format JWT avec la date d'expiration voulue (la signature n'est pas lue). */
const fakeJwt = (exp: number) => `xxx.${btoa(JSON.stringify({ sub: 'u', exp })).replace(/=+$/, '')}.sig`;

describe('session du back-office (ADR-0009)', () => {
  it('lit la date d’expiration d’un jeton d’accès', () => {
    expect(jwtExpiresAt(fakeJwt(1_800_000_000))).toBe(1_800_000_000_000);
    expect(jwtExpiresAt('pas-un-jeton')).toBeNull();
    expect(jwtExpiresAt('a.!!!.b')).toBeNull();
    expect(jwtExpiresAt(`a.${btoa('{"exp":"demain"}')}.b`)).toBeNull();
  });

  it('renouvelle une minute avant l’expiration, ou si le jeton manque', () => {
    const now = 1_000_000_000_000;
    expect(needsRefresh(undefined, now)).toBe(true);
    expect(needsRefresh(fakeJwt(now / 1000 + 600), now)).toBe(false);
    expect(needsRefresh(fakeJwt(now / 1000 + 30), now)).toBe(true);
    expect(needsRefresh(fakeJwt(now / 1000 - 1), now)).toBe(true);
    expect(needsRefresh('illisible', now)).toBe(true);
  });

  it('ne renvoie après connexion que vers une page du back-office', () => {
    expect(safeAdminPath('/admin/comptes?q=brice')).toBe('/admin/comptes?q=brice');
    expect(safeAdminPath('/admin')).toBe('/admin');
    expect(safeAdminPath('https://pirate.example/admin')).toBe(ADMIN_PATH);
    expect(safeAdminPath('//pirate.example')).toBe(ADMIN_PATH);
    expect(safeAdminPath('/admin\\..\\x')).toBe(ADMIN_PATH);
    expect(safeAdminPath('/administration')).toBe(ADMIN_PATH);
    expect(safeAdminPath('/junior-bonaberi')).toBe(ADMIN_PATH);
    expect(safeAdminPath('/admin/connexion?suite=/admin')).toBe(ADMIN_PATH);
    expect(safeAdminPath(null)).toBe(ADMIN_PATH);
  });

  it('redirige vers le domaine public de démonstration, sinon vers l’adresse de la requête', () => {
    expect(absoluteUrl('/admin/connexion', 'http://localhost:3000/admin', 'cs-3000.app.github.dev').href)
      .toBe('https://cs-3000.app.github.dev/admin/connexion');
    expect(absoluteUrl('/admin/connexion', 'https://interactrecord.com/admin', undefined).href)
      .toBe('https://interactrecord.com/admin/connexion');
    // Un chemin déjà filtré ne peut pas changer de domaine.
    expect(absoluteUrl('/fr', 'https://interactrecord.com/lang', '').origin).toBe('https://interactrecord.com');
  });

  it('pose des cookies httpOnly, SameSite strict, limités à /admin', () => {
    expect(cookieOptions(60, true)).toEqual({ httpOnly: true, sameSite: 'strict', secure: true, path: '/admin', maxAge: 60 });
  });

  it('n’envoie qu’un renouvellement pour des requêtes simultanées (évite la détection de vol)', async () => {
    const tokens: TokenPair = { accessToken: 'a2', accessTokenExpiresIn: 900, refreshToken: 'r2' };
    const refresh = vi.fn(async (): Promise<RefreshResult> => ({ status: 'ok', tokens }));
    const once = createRefreshDeduper(refresh);
    const results = await Promise.all([once('r1'), once('r1'), once('r1')]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.status === 'ok' && r.tokens === tokens)).toBe(true);
  });

  it('ne garde rien après l’appel : un ancien jeton réutilisé plus tard repart vers l’API, qui le détecte (revue M2)', async () => {
    const refresh = vi.fn(async (): Promise<RefreshResult> => ({ status: 'rejected' }));
    const once = createRefreshDeduper(refresh);
    await once('r1');
    await once('r1');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('laisse réessayer si le renouvellement a échoué par une exception', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('réseau')).mockResolvedValueOnce({ status: 'unavailable' });
    const once = createRefreshDeduper(refresh);
    await expect(once('r1')).rejects.toThrow('réseau');
    expect(await once('r1')).toEqual({ status: 'unavailable' });
  });

  it('ne déconnecte que sur un vrai refus de l’API, pas sur une limite de débit ou une panne (revue M1)', () => {
    expect(classifyRefresh(401)).toBe('rejected');
    expect(classifyRefresh(429)).toBe('unavailable');
    expect(classifyRefresh(503)).toBe('unavailable');
    expect(classifyRefresh(500)).toBe('unavailable');
  });

  it('refuse les chemins de retour qui changent d’origine une fois interprétés (revue G1)', () => {
    expect(safeAdminPath('/admin/\t/x')).toBe(ADMIN_PATH);
    expect(safeAdminPath('/admin\n//pirate.example')).toBe(ADMIN_PATH);
    expect(safeAdminPath('/admin/journal?action=user.')).toBe('/admin/journal?action=user.');
  });
});
