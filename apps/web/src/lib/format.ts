import type { Locale } from '@/i18n/dictionary';
import type { PublicImage } from './api';

/** Montant en FCFA : « 150 000 FCFA » en français, « 150,000 FCFA » en anglais. */
export function formatXaf(amount: number, locale: Locale): string {
  const n = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }).format(amount);
  return `${n} FCFA`;
}

export function formatMonthYear(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

/** Biographie dans la langue demandée, sinon dans l'autre langue. */
export function pickBio(a: { bioFr: string | null; bioEn: string | null }, locale: Locale): string | null {
  const primary = locale === 'fr' ? a.bioFr : a.bioEn;
  const fallback = locale === 'fr' ? a.bioEn : a.bioFr;
  return primary?.trim() || fallback?.trim() || null;
}

export function srcSet(image: PublicImage): string {
  return image.variants.map((v) => `${v.url} ${v.width}w`).join(', ');
}

/** Plus petite déclinaison au moins aussi large que demandé (ou la plus grande). */
export function pickVariant(image: PublicImage, minWidth: number) {
  return image.variants.find((v) => v.width >= minWidth) ?? image.variants[image.variants.length - 1];
}

/** Nom localisé d'un objet bilingue de l'API. */
export const localized = (o: { nameFr: string; nameEn: string }, locale: Locale) => (locale === 'fr' ? o.nameFr : o.nameEn);
export const localizedLabel = (o: { labelFr: string; labelEn: string }, locale: Locale) => (locale === 'fr' ? o.labelFr : o.labelEn);

/** Un chemin de retour sûr : interne au site, jamais vers un autre domaine. */
export function safeBackPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}
