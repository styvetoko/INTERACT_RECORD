import { describe, expect, it } from 'vitest';
import { can, homeFor, isStaff, sectionsFor, type Capability } from './permissions';

describe('droits du back-office (ADM-01), alignés sur l’API', () => {
  it('refuse l’accès aux comptes qui ne font pas partie de l’équipe', () => {
    expect(isStaff(['FAN'])).toBe(false);
    expect(isStaff(['FAN', 'ARTIST', 'MANAGER'])).toBe(false);
    expect(isStaff(['FAN', 'SUPPORT'])).toBe(true);
    expect(sectionsFor(['FAN', 'ARTIST'])).toEqual([]);
  });

  const cases: [string, Capability, boolean][] = [
    ['ADMIN', 'users.search', true], ['SUPPORT', 'users.search', true], ['MODERATOR', 'users.search', false],
    ['MODERATOR', 'users.view', true], ['FINANCE', 'users.view', false],
    ['MODERATOR', 'users.suspend', true], ['SUPPORT', 'users.suspend', false],
    ['ADMIN', 'users.roles', true], ['MODERATOR', 'users.roles', false],
    ['MODERATOR', 'artists.verify', true], ['EDITOR', 'artists.verify', false],
    ['ADMIN', 'audit.read', true], ['SUPPORT', 'audit.read', false],
  ];
  it.each(cases)('%s → %s : %s', (role, capability, expected) => {
    expect(can(['FAN', role], capability)).toBe(expected);
  });

  it('ouvre la première section utile selon le rôle', () => {
    expect(homeFor(['ADMIN'])).toBe('/admin/comptes');
    expect(homeFor(['MODERATOR'])).toBe('/admin/artistes');
    expect(homeFor(['SUPPORT'])).toBe('/admin/comptes');
    // Finance et éditorial : pas encore d'écran, la page d'accueil le dit.
    expect(homeFor(['FINANCE'])).toBeNull();
    expect(homeFor(['EDITOR'])).toBeNull();
  });

  it('montre au modérateur les artistes, pas la recherche de comptes ni le journal', () => {
    expect(sectionsFor(['MODERATOR']).map((s) => s.id)).toEqual(['artists']);
    expect(sectionsFor(['ADMIN']).map((s) => s.id)).toEqual(['users', 'artists', 'audit']);
  });
});
