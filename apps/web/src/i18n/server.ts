import { cookies, headers } from 'next/headers';
import { getDictionary, negotiateLocale, type Locale } from './dictionary';

export const LOCALE_COOKIE = 'lang';

/** Langue de la requête en cours, côté serveur. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return negotiateLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get('accept-language'));
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale) };
}
