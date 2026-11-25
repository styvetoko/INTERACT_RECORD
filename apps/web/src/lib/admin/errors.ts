/**
 * Codes d'erreur que le back-office sait expliquer. Le texte est dans fr.json et en.json
 * (admin.errors.<CODE>) ; un code inconnu affiche le message générique, jamais le détail technique.
 */
export const KNOWN_ERROR_CODES = [
  'PHONE_INVALID',
  'OTP_INVALID',
  'OTP_EXPIRED',
  'OTP_TOO_MANY_ATTEMPTS',
  'OTP_TOO_MANY_REQUESTS',
  'ACCOUNT_SUSPENDED',
  'ADMIN_ACCESS_DENIED',
  'AUTH_FORBIDDEN',
  'USER_NOT_FOUND',
  'ARTIST_NOT_FOUND',
  'USER_ALREADY_SUSPENDED',
  'USER_NOT_SUSPENDED',
  'ADMIN_CANNOT_SUSPEND_SELF',
  'ADMIN_CANNOT_SUSPEND_STAFF',
  'ADMIN_CANNOT_REACTIVATE_STAFF',
  'ADMIN_SUSPENSION_LOCKED',
  'ADMIN_CANNOT_REMOVE_OWN_ADMIN',
  'ARTIST_VERIFY_OWN_PROFILE',
  'REASON_TOO_SHORT',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'CURSOR_INVALID',
  'API_UNAVAILABLE',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];
export type ErrorKey = KnownErrorCode | 'GENERIC';

export function errorKey(code: string | null | undefined): ErrorKey {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code ?? '') ? (code as KnownErrorCode) : 'GENERIC';
}

/** Motif obligatoire des actions du back-office : mêmes bornes que l'API (5 à 500 caractères). */
export const REASON_MIN = 5;
export const REASON_MAX = 500;

export function checkReason(value: unknown): { ok: true; reason: string } | { ok: false; code: 'REASON_TOO_SHORT' } {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) return { ok: false, code: 'REASON_TOO_SHORT' };
  return { ok: true, reason };
}

/** État renvoyé par les actions serveur aux formulaires. */
export type FormState =
  | { status: 'idle' }
  | { status: 'error'; code: ErrorKey }
  | { status: 'success' };

export const IDLE: FormState = { status: 'idle' };
