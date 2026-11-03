import { ContentFormat, PrismaClient } from '@prisma/client';
import { MetadataField, MetadataSchemaDefinition } from './metadata-schema';

type Cat = [slug: string, fr: string, en: string];
interface DisciplineSeed {
  slug: string;
  nameFr: string;
  nameEn: string;
  enabled: boolean;
  formats: ContentFormat[];
  categories: Cat[];
  metadata: MetadataField[];
}

const opt = (value: string, labelFr: string, labelEn = labelFr) => ({ value, labelFr, labelEn });
const LANGUAGES = [
  opt('fr', 'Français', 'French'), opt('en', 'Anglais', 'English'), opt('pidgin', 'Pidgin'),
  opt('camfranglais', 'Camfranglais'), opt('duala', 'Duala'), opt('ewondo', 'Ewondo'),
  opt('bassa', 'Bassa'), opt('fulfulde', 'Fulfuldé', 'Fulfulde'), opt('ghomala', 'Ghomala'),
  opt('other', 'Autre', 'Other'),
];
const field = (f: Partial<MetadataField> & Pick<MetadataField, 'key' | 'labelFr' | 'labelEn' | 'type'>): MetadataField => ({
  required: false,
  searchable: false,
  ...f,
});

/** Disciplines de lancement (activées) et disciplines prévues (désactivées), section 5 du cahier des charges. */
export const DISCIPLINES: DisciplineSeed[] = [
  {
    slug: 'musique', nameFr: 'Musique', nameEn: 'Music', enabled: true,
    formats: ['AUDIO', 'VIDEO', 'LIVE', 'SERVICE', 'TEXT'],
    categories: [
      ['makossa', 'Makossa', 'Makossa'], ['bikutsi', 'Bikutsi', 'Bikutsi'], ['afro-pop', 'Afro-pop', 'Afro-pop'],
      ['mbole', 'Mbolé', 'Mbole'], ['rap-hip-hop', 'Rap et hip-hop', 'Rap and hip-hop'], ['assiko', 'Assiko', 'Assiko'],
      ['ben-skin', 'Ben-skin', 'Ben-skin'], ['gospel', 'Gospel', 'Gospel'], ['rnb', 'R&B', 'R&B'], ['zouk', 'Zouk', 'Zouk'],
      ['coupe-decale', 'Coupé-décalé', 'Coupe-decale'], ['afrobeats', 'Afrobeats', 'Afrobeats'],
      ['traditionnelle', 'Musique traditionnelle', 'Traditional music'], ['instrumentals', 'Instrumentals', 'Instrumentals'],
    ],
    metadata: [
      field({ key: 'composer', labelFr: 'Compositeur', labelEn: 'Composer', type: 'text', appliesTo: ['AUDIO', 'VIDEO'] }),
      field({ key: 'lyricist', labelFr: 'Auteur des paroles', labelEn: 'Lyricist', type: 'text', appliesTo: ['AUDIO', 'VIDEO'] }),
      field({ key: 'producer', labelFr: 'Beatmaker ou producteur', labelEn: 'Beatmaker or producer', type: 'text', appliesTo: ['AUDIO', 'VIDEO'] }),
      field({ key: 'isrc', labelFr: 'Code ISRC', labelEn: 'ISRC code', type: 'text', maxLength: 12, appliesTo: ['AUDIO'] }),
      field({ key: 'bpm', labelFr: 'Tempo (BPM)', labelEn: 'Tempo (BPM)', type: 'integer', min: 30, max: 300, appliesTo: ['AUDIO'] }),
      field({ key: 'languages', labelFr: 'Langues', labelEn: 'Languages', type: 'multiselect', options: LANGUAGES, searchable: true }),
      field({ key: 'explicit', labelFr: 'Contenu explicite', labelEn: 'Explicit content', type: 'boolean', required: true, appliesTo: ['AUDIO', 'VIDEO'] }),
      field({ key: 'lyrics', labelFr: 'Paroles', labelEn: 'Lyrics', type: 'longtext', maxLength: 10_000, appliesTo: ['AUDIO', 'VIDEO', 'TEXT'] }),
    ],
  },
  {
    slug: 'humour', nameFr: 'Humour', nameEn: 'Comedy', enabled: true,
    formats: ['VIDEO', 'AUDIO', 'LIVE', 'SERVICE'],
    categories: [
      ['stand-up', 'Stand-up', 'Stand-up'], ['sketch', 'Sketch', 'Sketch'], ['parodie', 'Parodie', 'Parody'],
      ['imitation', 'Imitation', 'Impressions'], ['langues-locales', 'Humour en langues locales', 'Comedy in local languages'],
      ['podcast', 'Podcast humoristique', 'Comedy podcast'],
    ],
    metadata: [
      field({ key: 'languages', labelFr: 'Langues', labelEn: 'Languages', type: 'multiselect', options: LANGUAGES, required: true, searchable: true }),
      field({ key: 'audience', labelFr: 'Public', labelEn: 'Audience', type: 'select', required: true, options: [opt('all', 'Tout public', 'All audiences'), opt('adult', 'Adulte', 'Adult')], searchable: true }),
      field({ key: 'characters', labelFr: 'Personnages récurrents', labelEn: 'Recurring characters', type: 'text' }),
    ],
  },
  {
    slug: 'danse', nameFr: 'Danse', nameEn: 'Dance', enabled: true,
    formats: ['VIDEO', 'LIVE', 'SERVICE'],
    categories: [
      ['afro-dance', 'Afro-dance', 'Afro-dance'], ['urbaine', 'Danse urbaine', 'Urban dance'],
      ['traditionnelle', 'Danse traditionnelle', 'Traditional dance'], ['contemporain', 'Contemporain', 'Contemporary'],
      ['choregraphie-clip', 'Chorégraphie de clips', 'Music video choreography'],
    ],
    metadata: [
      field({ key: 'style', labelFr: 'Style', labelEn: 'Style', type: 'text', searchable: true }),
      field({ key: 'tutorialLevel', labelFr: 'Niveau du tutoriel', labelEn: 'Tutorial level', type: 'select', options: [opt('beginner', 'Débutant', 'Beginner'), opt('intermediate', 'Intermédiaire', 'Intermediate'), opt('advanced', 'Avancé', 'Advanced')] }),
      field({ key: 'musicTitle', labelFr: 'Musique utilisée', labelEn: 'Music used', type: 'text' }),
      field({ key: 'crewMembers', labelFr: 'Membres du crew', labelEn: 'Crew members', type: 'text' }),
    ],
  },
  {
    slug: 'peinture', nameFr: 'Peinture', nameEn: 'Painting', enabled: true,
    formats: ['IMAGE', 'VIDEO', 'PHYSICAL_WORK', 'SERVICE', 'LIVE'],
    categories: [
      ['contemporaine', 'Peinture contemporaine', 'Contemporary painting'], ['traditionnel', 'Art traditionnel', 'Traditional art'],
      ['urbain', 'Art urbain et graffiti', 'Street art and graffiti'], ['portrait', 'Portrait', 'Portrait'],
      ['numerique', 'Art numérique', 'Digital art'],
    ],
    metadata: [
      field({ key: 'technique', labelFr: 'Technique', labelEn: 'Technique', type: 'select', required: true, searchable: true, appliesTo: ['IMAGE', 'PHYSICAL_WORK'], options: [opt('oil', 'Huile', 'Oil'), opt('acrylic', 'Acrylique', 'Acrylic'), opt('watercolor', 'Aquarelle', 'Watercolour'), opt('mixed', 'Technique mixte', 'Mixed media'), opt('spray', 'Bombe aérosol', 'Spray paint'), opt('digital', 'Numérique', 'Digital'), opt('other', 'Autre', 'Other')] }),
      field({ key: 'support', labelFr: 'Support', labelEn: 'Medium', type: 'text', appliesTo: ['IMAGE', 'PHYSICAL_WORK'] }),
      field({ key: 'widthCm', labelFr: 'Largeur (cm)', labelEn: 'Width (cm)', type: 'number', min: 1, max: 2000, appliesTo: ['PHYSICAL_WORK'], required: true }),
      field({ key: 'heightCm', labelFr: 'Hauteur (cm)', labelEn: 'Height (cm)', type: 'number', min: 1, max: 2000, appliesTo: ['PHYSICAL_WORK'], required: true }),
      field({ key: 'year', labelFr: 'Année', labelEn: 'Year', type: 'integer', min: 1900, max: 2100, appliesTo: ['IMAGE', 'PHYSICAL_WORK'] }),
      field({ key: 'condition', labelFr: 'État', labelEn: 'Condition', type: 'select', appliesTo: ['PHYSICAL_WORK'], options: [opt('new', 'Neuf', 'New'), opt('very-good', 'Très bon', 'Very good'), opt('good', 'Bon', 'Good')] }),
      field({ key: 'framed', labelFr: 'Encadré', labelEn: 'Framed', type: 'boolean', appliesTo: ['PHYSICAL_WORK'] }),
    ],
  },
  ...([
    ['slam-poesie', 'Slam et poésie', 'Spoken word and poetry', ['TEXT', 'AUDIO', 'VIDEO', 'LIVE', 'SERVICE']],
    ['theatre', 'Théâtre', 'Theatre', ['VIDEO', 'LIVE', 'SERVICE']],
    ['cinema', 'Cinéma et courts métrages', 'Film and short films', ['VIDEO', 'SERVICE']],
    ['photographie', 'Photographie', 'Photography', ['IMAGE', 'PHYSICAL_WORK', 'SERVICE']],
    ['mode', 'Mode et stylisme', 'Fashion and styling', ['IMAGE', 'VIDEO', 'PHYSICAL_WORK', 'SERVICE']],
    ['sculpture', 'Sculpture', 'Sculpture', ['IMAGE', 'PHYSICAL_WORK', 'SERVICE']],
    ['artisanat', "Artisanat d'art", 'Fine crafts', ['IMAGE', 'PHYSICAL_WORK', 'SERVICE']],
    ['illustration-bd', 'Illustration et bande dessinée', 'Illustration and comics', ['IMAGE', 'TEXT', 'PHYSICAL_WORK', 'SERVICE']],
    ['djing', 'DJing', 'DJing', ['AUDIO', 'VIDEO', 'LIVE', 'SERVICE']],
    ['beatmaking', 'Beatmaking', 'Beatmaking', ['AUDIO', 'SERVICE']],
  ] as [string, string, string, ContentFormat[]][]).map(([slug, nameFr, nameEn, formats]) => ({
    slug, nameFr, nameEn, enabled: false, formats, categories: [] as Cat[], metadata: [] as MetadataField[],
  })),
];

/** Crée ou met à jour les disciplines sans écraser les réglages faits depuis le back-office (activation). */
export async function seedDisciplines(prisma: PrismaClient): Promise<void> {
  for (const [index, d] of DISCIPLINES.entries()) {
    const metadataSchema = MetadataSchemaDefinition.parse(d.metadata);
    const discipline = await prisma.discipline.upsert({
      where: { slug: d.slug },
      create: {
        slug: d.slug, nameFr: d.nameFr, nameEn: d.nameEn, enabled: d.enabled,
        sortOrder: index * 10, allowedFormats: d.formats, metadataSchema,
      },
      update: { nameFr: d.nameFr, nameEn: d.nameEn, allowedFormats: d.formats, metadataSchema },
    });
    for (const [i, [slug, nameFr, nameEn]] of d.categories.entries()) {
      await prisma.category.upsert({
        where: { disciplineId_slug: { disciplineId: discipline.id, slug } },
        create: { disciplineId: discipline.id, slug, nameFr, nameEn, sortOrder: i * 10 },
        update: { nameFr, nameEn },
      });
    }
  }
}
