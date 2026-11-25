/**
 * Droits du back-office (ADM-01). Même matrice que les décorateurs @Roles de l'API :
 * le web masque ce qui serait refusé, l'API reste seule juge.
 */

export const INTERNAL_ROLES = ['ADMIN', 'MODERATOR', 'FINANCE', 'SUPPORT', 'EDITOR'] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];
export type Role = InternalRole | 'FAN' | 'ARTIST' | 'MANAGER';

export type Capability =
  | 'users.search'
  | 'users.view'
  | 'users.suspend'
  | 'users.roles'
  | 'artists.verify'
  | 'audit.read';

/** Source : apps/api/src/users/users-admin.controller.ts, artists.controller.ts, audit.controller.ts */
const MATRIX: Record<Capability, readonly InternalRole[]> = {
  'users.search': ['ADMIN', 'SUPPORT'],
  'users.view': ['ADMIN', 'SUPPORT', 'MODERATOR'],
  'users.suspend': ['ADMIN', 'MODERATOR'],
  'users.roles': ['ADMIN'],
  'artists.verify': ['ADMIN', 'MODERATOR'],
  'audit.read': ['ADMIN'],
};

export const isInternalRole = (role: string): role is InternalRole => (INTERNAL_ROLES as readonly string[]).includes(role);

/** Le compte fait-il partie de l'équipe ? Sinon, pas d'accès au back-office. */
export const isStaff = (roles: readonly string[]): boolean => roles.some(isInternalRole);

export function can(roles: readonly string[], capability: Capability): boolean {
  return MATRIX[capability].some((r) => roles.includes(r));
}

export type Section = 'users' | 'artists' | 'audit';

export const SECTIONS: { id: Section; href: string; capability: Capability }[] = [
  { id: 'users', href: '/admin/comptes', capability: 'users.search' },
  { id: 'artists', href: '/admin/artistes', capability: 'artists.verify' },
  { id: 'audit', href: '/admin/journal', capability: 'audit.read' },
];

export const sectionsFor = (roles: readonly string[]) => SECTIONS.filter((s) => can(roles, s.capability));

/** Première page utile pour ce rôle ; null si aucun outil n'existe encore pour lui (finance, éditorial). */
export const homeFor = (roles: readonly string[]): string | null => sectionsFor(roles)[0]?.href ?? null;
