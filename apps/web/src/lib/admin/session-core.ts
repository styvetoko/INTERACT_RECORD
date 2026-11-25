/**
 * Session du back-office (ADR-0009) : fonctions pures, utilisables dans le middleware et testées.
 * Aucun jeton n'est jamais lisible par le JavaScript du navigateur.
 */

export const ACCESS_COOKIE = 'ir_admin_at';
export const REFRESH_COOKIE = 'ir_admin_rt';
export const ADMIN_PATH = '/admin';
export const LOGIN_PATH = '/admin/connexion';

/** Durée de vie du cookie, reposée à chaque renouvellement : 8 heures sans activité (pas de limite absolue, voir avant-production). */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;
/** On renouvelle le jeton d'accès une minute avant son expiration. */
export const REFRESH_MARGIN_MS = 60_000;

export const DEVICE_NAME = 'Back-office web';

/**
 * Adresse absolue pour une redirection. Derrière le proxy de démonstration (Codespaces), le serveur
 * ne voit que « localhost » : on utilise alors le domaine public déclaré (DEMO_PUBLIC_HOST).
 */
export function absoluteUrl(path: string, requestUrl: string, demoHost = process.env.DEMO_PUBLIC_HOST): URL {
  return new URL(path, demoHost && demoHost !== 'localhost:3000' ? `https://${demoHost}` : requestUrl);
}

export interface CookieOptions {
  httpOnly: true;
  sameSite: 'strict';
  secure: boolean;
  path: string;
  maxAge: number;
}

export function cookieOptions(maxAge: number, secure = process.env.NODE_ENV === 'production'): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path: ADMIN_PATH, maxAge };
}

/**
 * Date d'expiration d'un jeton d'accès (champ « exp »), sans vérifier la signature :
 * sert seulement à savoir quand renouveler. L'API reste seule à valider le jeton.
 */
export function jwtExpiresAt(token: string): number | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Faut-il renouveler le jeton d'accès avant de servir la page ? */
export function needsRefresh(accessToken: string | undefined, now = Date.now()): boolean {
  if (!accessToken) return true;
  const exp = jwtExpiresAt(accessToken);
  return exp === null || exp - now <= REFRESH_MARGIN_MS;
}

/** Chemin de retour après connexion : uniquement une page du back-office, jamais un autre site. */
export function safeAdminPath(value: string | null | undefined): string {
  if (!value || value.includes('\\') || value.startsWith('//') || /[\u0000-\u001f\u007f]/.test(value)) return ADMIN_PATH;
  try {
    if (new URL(value, 'https://interactrecord.invalid').origin !== 'https://interactrecord.invalid') return ADMIN_PATH;
  } catch {
    return ADMIN_PATH;
  }
  if (value !== ADMIN_PATH && !value.startsWith(`${ADMIN_PATH}/`)) return ADMIN_PATH;
  if (value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`) || value.startsWith(`${LOGIN_PATH}/`)) return ADMIN_PATH;
  return value;
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

/** Résultat d'un renouvellement : refusé par l'API (session finie) ou impossible pour l'instant (panne, limite). */
export type RefreshResult = { status: 'ok'; tokens: TokenPair } | { status: 'rejected' } | { status: 'unavailable' };

/** Seul un refus explicite de l'API (401) met fin à la session ; un 429 ou une panne ne déconnecte personne. */
export function classifyRefresh(status: number): 'rejected' | 'unavailable' {
  return status === 401 ? 'rejected' : 'unavailable';
}

/**
 * Évite qu'un même jeton de rafraîchissement parte deux fois vers l'API en même temps (ce qui
 * fermerait toutes les sessions, ADR-0004) : les requêtes simultanées partagent l'appel en cours.
 * Rien n'est gardé une fois l'appel terminé (revue sécurité M2) : réutiliser plus tard un ancien
 * jeton reste détecté par l'API. Mémoire d'une seule instance.
 */
export function createRefreshDeduper(refresh: (refreshToken: string) => Promise<RefreshResult>) {
  const inFlight = new Map<string, Promise<RefreshResult>>();
  return (refreshToken: string): Promise<RefreshResult> => {
    const pending = inFlight.get(refreshToken);
    if (pending) return pending;
    const promise = refresh(refreshToken).finally(() => inFlight.delete(refreshToken));
    inFlight.set(refreshToken, promise);
    return promise;
  };
}
