import { DISCIPLINES } from './seed-data';
import { MetadataSchemaDefinition, validateMetadata } from './metadata-schema';

const music = MetadataSchemaDefinition.parse(DISCIPLINES.find((d) => d.slug === 'musique')!.metadata);
const painting = MetadataSchemaDefinition.parse(DISCIPLINES.find((d) => d.slug === 'peinture')!.metadata);

describe('métadonnées configurables par discipline', () => {
  it('toutes les disciplines de départ ont une configuration valide', () => {
    for (const d of DISCIPLINES) expect(() => MetadataSchemaDefinition.parse(d.metadata)).not.toThrow();
  });

  it('accepte un titre musical complet', () => {
    const r = validateMetadata(music, { composer: 'Junior', bpm: 102, languages: ['fr', 'pidgin'], explicit: false }, 'AUDIO');
    expect(r.ok).toBe(true);
  });

  it('exige les champs obligatoires du format', () => {
    const r = validateMetadata(music, { composer: 'Junior' }, 'AUDIO');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.path)).toContain('explicit');
  });

  it("refuse une valeur hors liste et un champ inconnu", () => {
    const r = validateMetadata(music, { explicit: false, languages: ['klingon'], unknownField: 1 }, 'AUDIO');
    expect(r.ok).toBe(false);
  });

  it("ignore les champs qui ne concernent pas le format (le BPM n'existe pas pour une vidéo)", () => {
    expect(validateMetadata(music, { explicit: true, bpm: 100 }, 'VIDEO').ok).toBe(false);
    expect(validateMetadata(music, { explicit: true }, 'VIDEO').ok).toBe(true);
  });

  it("exige les dimensions d'une peinture originale mais pas d'une image", () => {
    expect(validateMetadata(painting, { technique: 'oil' }, 'PHYSICAL_WORK').ok).toBe(false);
    expect(validateMetadata(painting, { technique: 'oil', widthCm: 80, heightCm: 120 }, 'PHYSICAL_WORK').ok).toBe(true);
    expect(validateMetadata(painting, { technique: 'acrylic' }, 'IMAGE').ok).toBe(true);
  });

  it('refuse une configuration mal formée', () => {
    expect(() => MetadataSchemaDefinition.parse([{ key: 'style', labelFr: 'Style', labelEn: 'Style', type: 'select' }])).toThrow();
    expect(() =>
      MetadataSchemaDefinition.parse([
        { key: 'a', labelFr: 'A', labelEn: 'A', type: 'text' },
        { key: 'a', labelFr: 'A', labelEn: 'A', type: 'text' },
      ]),
    ).toThrow();
  });
});
