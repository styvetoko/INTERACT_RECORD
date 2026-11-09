import en from './en.json';
import fr from './fr.json';

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export type Dictionary = typeof fr;
const dictionaries: Record<Locale, Dictionary> = { fr, en };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

/** Choisit la langue : cookie explicite, sinon première langue connue du navigateur, sinon français. */
export function negotiateLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Remplace les variables « {name} » d'un texte traduit. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));
}

/** Accord en nombre selon les règles de la langue (fr : 0 et 1 au singulier ; en : 1 seulement). */
export function plural(forms: { one: string; other: string }, count: number, locale: Locale): string {
  const rule = new Intl.PluralRules(locale === 'fr' ? 'fr-FR' : 'en-GB').select(count);
  return t(rule === 'one' ? forms.one : forms.other, { count });
}
