import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

/** Normalise un numéro au format international E.164 (ex. +237677123456), ou null s'il est invalide. */
export function normalizePhone(input: string, defaultCountry: string = 'CM'): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry as CountryCode);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** Masque un numéro pour les journaux : +237677***456 */
export function maskPhone(phone: string): string {
  return phone.length > 7 ? `${phone.slice(0, 7)}***${phone.slice(-3)}` : '***';
}
