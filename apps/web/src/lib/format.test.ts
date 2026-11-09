import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';
import { negotiateLocale, plural, t } from '@/i18n/dictionary';
import { formatXaf, pickBio, pickVariant, safeBackPath } from './format';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe('traductions', () => {
  it('le français et l’anglais ont exactement les mêmes clés', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });
  it('accorde au singulier et au pluriel selon la langue', () => {
    expect(plural(fr.artist.members, 1, 'fr')).toBe('1 membre');
    expect(plural(fr.artist.members, 0, 'fr')).toBe('0 membre');
    expect(plural(fr.artist.members, 6, 'fr')).toBe('6 membres');
    expect(plural(en.artist.members, 0, 'en')).toBe('0 members');
    expect(plural(en.artist.members, 1, 'en')).toBe('1 member');
  });
  it('remplace les variables', () => {
    expect(t('{count} artistes', { count: 12 })).toBe('12 artistes');
  });
  it('choisit la langue : cookie, puis navigateur, puis français', () => {
    expect(negotiateLocale('en', 'fr-FR')).toBe('en');
    expect(negotiateLocale(undefined, 'en-US,en;q=0.9')).toBe('en');
    expect(negotiateLocale(undefined, 'de-DE')).toBe('fr');
    expect(negotiateLocale('xx', null)).toBe('fr');
  });
});

describe('formats', () => {
  it('écrit les montants en FCFA sans décimales', () => {
    expect(formatXaf(150000, 'fr').replace(/\s/g, ' ')).toBe('150 000 FCFA');
    expect(formatXaf(150000, 'en').replace(/\s/g, ' ')).toBe('150,000 FCFA');
  });
  it('se replie sur l’autre langue quand la biographie manque', () => {
    expect(pickBio({ bioFr: null, bioEn: 'Comedian' }, 'fr')).toBe('Comedian');
    expect(pickBio({ bioFr: '  ', bioEn: null }, 'fr')).toBeNull();
  });
  it('choisit la bonne taille d’image', () => {
    const img = { width: 512, height: 512, dominantColor: '#000000', placeholder: '', variants: [128, 256, 512].map((w) => ({ width: w, height: w, url: `/${w}` })) };
    expect(pickVariant(img, 200).width).toBe(256);
    expect(pickVariant(img, 900).width).toBe(512);
  });
  it('refuse les redirections vers un autre site', () => {
    expect(safeBackPath('/ernest')).toBe('/ernest');
    expect(safeBackPath('//evil.com')).toBe('/');
    expect(safeBackPath('https://evil.com')).toBe('/');
    expect(safeBackPath('/\\evil.com')).toBe('/');
  });
});
