import { hashSecret, verifySecret } from './crypto';
import { normalizePhone } from './phone';
import { isReservedSlug, slugify } from './slug';

describe('numéros de téléphone', () => {
  it('normalise les formats camerounais courants', () => {
    expect(normalizePhone('677 12 34 56')).toBe('+237677123456');
    expect(normalizePhone('+237 6 99 12 34 56')).toBe('+237699123456');
    expect(normalizePhone('00237655123456')).toBe('+237655123456');
  });
  it('refuse un numéro invalide', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('bonjour')).toBeNull();
  });
});

describe('identifiants d’URL', () => {
  it('retire accents et caractères spéciaux', () => {
    expect(slugify('Ténor & Ko-c !')).toBe('tenor-ko-c');
    expect(slugify('  Bantu   Moves  ')).toBe('bantu-moves');
  });
  it('connaît les identifiants réservés', () => expect(isReservedSlug('admin')).toBe(true));
});

describe('hachage des secrets', () => {
  it('vérifie le bon secret et refuse le mauvais', async () => {
    const stored = await hashSecret('258014');
    expect(await verifySecret('258014', stored)).toBe(true);
    expect(await verifySecret('258015', stored)).toBe(false);
    expect(await verifySecret('258014', 'garbage')).toBe(false);
  });
});
