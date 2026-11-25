import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE, classifyRefresh, cookieOptions, createRefreshDeduper, DEVICE_NAME, LOGIN_PATH, needsRefresh,
  REFRESH_COOKIE, REFRESH_COOKIE_MAX_AGE_SECONDS, type RefreshResult, type TokenPair,
} from '@/lib/admin/session-core';

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/** Un renouvellement par jeton de rafraîchissement, même si plusieurs requêtes arrivent ensemble (ADR-0009). */
const refreshOnce = createRefreshDeduper(async (refreshToken): Promise<RefreshResult> => {
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ refreshToken, deviceName: DEVICE_NAME }),
    });
    if (res.ok) return { status: 'ok', tokens: (await res.json()) as TokenPair };
    return { status: classifyRefresh(res.status) };
  } catch {
    return { status: 'unavailable' };
  }
});

/** Le back-office n'est jamais mis en cache ni référencé. */
function harden(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

function toLogin(request: NextRequest): NextResponse {
  // Seul le chemin est gardé : une recherche par numéro ne doit pas se recopier dans l'adresse (revue F3).
  // Adresse relative : juste derrière n'importe quel proxy.
  const location = `${LOGIN_PATH}?${new URLSearchParams({ suite: request.nextUrl.pathname })}`;
  const res = new NextResponse(null, { status: 303, headers: { Location: location } });
  res.cookies.set(ACCESS_COOKIE, '', cookieOptions(0));
  res.cookies.set(REFRESH_COOKIE, '', cookieOptions(0));
  return harden(res);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) return harden(NextResponse.next());

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return toLogin(request);
  if (!needsRefresh(access)) return harden(NextResponse.next());

  const result = await refreshOnce(refresh);
  if (result.status === 'rejected') return toLogin(request);
  // Panne ou limite de débit (revue sécurité M1) : on ne déconnecte pas ; la page dira « réessaie ».
  if (result.status === 'unavailable') return harden(NextResponse.next());
  const { tokens } = result;

  // Les nouveaux jetons servent dès cette requête (pages et actions serveur) puis sont posés dans le navigateur.
  request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
  const res = NextResponse.next({ request: { headers: request.headers } });
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.accessTokenExpiresIn));
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS));
  return harden(res);
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
