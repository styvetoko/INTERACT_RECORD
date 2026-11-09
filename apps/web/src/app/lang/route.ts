import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@/i18n/dictionary';
import { LOCALE_COOKIE } from '@/i18n/server';
import { safeBackPath } from '@/lib/format';

/** Change la langue (cookie d'un an) puis revient sur la page d'origine, sur ce site uniquement. */
export function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to');
  const back = safeBackPath(request.nextUrl.searchParams.get('back'));
  const response = NextResponse.redirect(new URL(back, request.url), 303);
  if (isLocale(to)) {
    response.cookies.set(LOCALE_COOKIE, to, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  return response;
}
