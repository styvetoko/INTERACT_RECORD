import type { Locale } from '@/i18n/dictionary';

const tag = (locale: Locale) => (locale === 'fr' ? 'fr-FR' : 'en-GB');

/** Les dates du back-office sont affichées à l'heure du Cameroun (Africa/Douala). */
const TIME_ZONE = 'Africa/Douala';

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Détails d'une entrée du journal, lisibles : une ligne « clé : valeur » par champ. */
export function describeAuditData(data: unknown): string {
  if (data === null || data === undefined) return '';
  if (typeof data !== 'object') return String(data);
  return Object.entries(data as Record<string, unknown>)
    .map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
    .join('\n');
}

/** Lit un paramètre d'URL texte ; ignore les valeurs multiples ou trop longues. */
export function param(value: string | string[] | undefined, max = 80): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return v && v.length <= max ? v : undefined;
}

/** Garde les paramètres de filtre et remplace le curseur : lien vers la page suivante. */
export function withCursor(path: string, params: Record<string, string | undefined>, cursor?: string | null): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== 'cursor') qs.set(k, v);
  if (cursor) qs.set('cursor', cursor);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
