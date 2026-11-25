import { describe, expect, it, vi } from 'vitest';
import {
  ADMIN_PATH, cookieOptions, createRefreshDeduper, jwtExpiresAt, needsRefresh, safeAdminPath, type TokenPair,
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

  it('pose des cookies httpOnly, SameSite strict, limités à /admin', () => {
    expect(cookieOptions(60, true)).toEqual({ httpOnly: true, sameSite: 'strict', secure: true, path: '/admin', maxAge: 60 });
  });

  it('n’envoie qu’un renouvellement pour des requêtes simultanées (évite la détection de vol)', async () => {
    const pair: TokenPair = { accessToken: 'a2', accessTokenExpiresIn: 900, refreshToken: 'r2' };
    const refresh = vi.fn(async () => pair);
    const once = createRefreshDeduper(refresh);
    const results = await Promise.all([once('r1'), once('r1'), once('r1')]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual([pair, pair, pair]);
    // Une requête un peu plus tardive avec l'ancien jeton reçoit le même résultat.
    expect(await once('r1')).toBe(pair);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('oublie le résultat après 30 secondes', async () => {
    let clock = 0;
    const refresh = vi.fn(async () => null);
    const once = createRefreshDeduper(refresh, () => clock);
    await once('r1');
    clock = 31_000;
    await once('r1');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('laisse réessayer si le renouvellement a échoué par une exception', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('réseau')).mockResolvedValueOnce(null);
    const once = createRefreshDeduper(refresh);
    await expect(once('r1')).rejects.toThrow('réseau');
    expect(await once('r1')).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
