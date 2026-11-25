import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';
import { checkReason, errorKey, KNOWN_ERROR_CODES } from './errors';
import { describeAuditData, param, withCursor } from './format';

describe('messages d’erreur du back-office', () => {
  it('chaque code connu a un texte en français et en anglais', () => {
    for (const code of [...KNOWN_ERROR_CODES, 'GENERIC'] as const) {
      expect(fr.admin.errors[code]).toBeTruthy();
      expect(en.admin.errors[code]).toBeTruthy();
    }
  });

  it('un code inconnu ou absent donne le message générique, jamais le détail technique', () => {
    expect(errorKey('ADMIN_CANNOT_SUSPEND_SELF')).toBe('ADMIN_CANNOT_SUSPEND_SELF');
    expect(errorKey('INTERNAL_ERROR')).toBe('GENERIC');
    expect(errorKey('')).toBe('GENERIC');
    expect(errorKey(undefined)).toBe('GENERIC');
    expect(errorKey('toString')).toBe('GENERIC');
  });

  it('exige un motif de 5 à 500 caractères, comme l’API', () => {
    expect(checkReason('  abus  ')).toEqual({ ok: false, code: 'REASON_TOO_SHORT' });
    expect(checkReason(null)).toEqual({ ok: false, code: 'REASON_TOO_SHORT' });
    expect(checkReason('x'.repeat(501))).toEqual({ ok: false, code: 'REASON_TOO_SHORT' });
    expect(checkReason('  Arnaque signalée par 3 fans  ')).toEqual({ ok: true, reason: 'Arnaque signalée par 3 fans' });
  });
});

describe('outils d’affichage du back-office', () => {
  it('rend lisibles les détails du journal', () => {
    expect(describeAuditData({ reason: 'Spam', closedSessions: 2, after: ['FAN', 'ADMIN'] }))
      .toBe('reason : Spam\nclosedSessions : 2\nafter : FAN, ADMIN');
    expect(describeAuditData(null)).toBe('');
  });

  it('lit un paramètre d’URL simple et ignore le reste', () => {
    expect(param(' brice ')).toBe('brice');
    expect(param(['a', 'b'])).toBeUndefined();
    expect(param('x'.repeat(81))).toBeUndefined();
    expect(param('   ')).toBeUndefined();
  });

  it('construit le lien de la page suivante en gardant les filtres', () => {
    expect(withCursor('/admin/comptes', { q: 'brice', status: undefined }, 'abc')).toBe('/admin/comptes?q=brice&cursor=abc');
    expect(withCursor('/admin/comptes', { q: undefined })).toBe('/admin/comptes');
  });
});
