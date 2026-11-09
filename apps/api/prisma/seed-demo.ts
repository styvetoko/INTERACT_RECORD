/**
 * Données de démonstration (développement uniquement) : artistes FICTIFS avec visuels abstraits générés.
 * Refuse de tourner en production. Idempotent : un artiste déjà présent n'est pas recréé.
 *   pnpm --filter @interact/api seed:demo
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import sharp from 'sharp';
import tokens from '@interact/design-tokens/tokens.json';
import { AppModule } from '../src/app.module';
import { ArtistsService } from '../src/artists/artists.service';
import { PrismaService } from '../src/prisma/prisma.service';

try { process.loadEnvFile('.env'); } catch { /* variables déjà présentes */ }
if (process.env.NODE_ENV === 'production') throw new Error('Données de démonstration interdites en production');

const disc = tokens.color.discipline;
const brand = tokens.color.brand;

interface Demo {
  phone: string; stageName: string; city: string; discipline: 'musique' | 'humour' | 'danse' | 'peinture';
  categories: string[]; tagline: string; bioFr: string; bioEn: string; type?: 'COLLECTIVE';
  booking?: { min: number; max?: number; services: string[]; cities: string[] }; verified?: boolean;
}

const DEMOS: Demo[] = [
  { phone: '+237699000001', stageName: 'Ayo Ngando', city: 'Douala', discipline: 'musique', categories: ['makossa', 'afro-pop'], verified: true,
    tagline: 'Le makossa de demain, avec l’âme d’hier', bioFr: 'Chanteur et guitariste né à Akwa, Ayo mêle le makossa des années 80 aux productions afro-pop d’aujourd’hui.\n\nDeux EP, des scènes à Douala, Yaoundé et Abidjan.', bioEn: 'Singer and guitarist born in Akwa, Ayo blends 80s makossa with today’s afro-pop.',
    booking: { min: 250000, max: 900000, services: ['concert', 'showcase', 'featuring'], cities: ['Douala', 'Yaoundé', 'Kribi'] } },
  { phone: '+237699000002', stageName: 'Mbia Flow', city: 'Yaoundé', discipline: 'musique', categories: ['rap-hip-hop'],
    tagline: 'Rap camfranglais, punchlines du Mfoundi', bioFr: 'Rappeur de Mvog-Ada, Mbia Flow raconte la vie de quartier en camfranglais.', bioEn: 'Rapper from Mvog-Ada telling neighbourhood stories in Camfranglais.',
    booking: { min: 100000, services: ['concert', 'showcase'], cities: ['Yaoundé'] } },
  { phone: '+237699000003', stageName: 'Ngono Bikutsi', city: 'Yaoundé', discipline: 'musique', categories: ['bikutsi'],
    tagline: 'Le bikutsi au féminin, sans filtre', bioFr: 'Voix puissante et balafon électrique : Ngono réinvente le bikutsi.', bioEn: 'A powerful voice and electric balafon: Ngono reinvents bikutsi.' },
  { phone: '+237699000004', stageName: 'Tonton Rigolo', city: 'Douala', discipline: 'humour', categories: ['stand-up', 'langues-locales'], verified: true,
    tagline: 'Le rire en pidgin, en français et en duala', bioFr: 'Humoriste de scène, Tonton Rigolo fait rire les mariages et les salles de Douala depuis 8 ans.', bioEn: 'Stand-up comedian making Douala laugh for 8 years.',
    booking: { min: 150000, max: 400000, services: ['spectacle-humour', 'mc', 'animation'], cities: ['Douala', 'Limbé', 'Buea'] } },
  { phone: '+237699000005', stageName: 'Les Sketcheuses', city: 'Bafoussam', discipline: 'humour', categories: ['sketch'], type: 'COLLECTIVE',
    tagline: 'Trois copines, mille personnages', bioFr: 'Collectif de sketchs vu des millions de fois sur les réseaux.', bioEn: 'Sketch collective with millions of views online.' },
  { phone: '+237699000006', stageName: 'Bantu Moves', city: 'Douala', discipline: 'danse', categories: ['afro-dance', 'choregraphie-clip'], type: 'COLLECTIVE', verified: true,
    tagline: 'Six danseurs, une seule énergie', bioFr: 'Crew d’afro-dance de Bonabéri : battles, clips et cours.', bioEn: 'Afro-dance crew from Bonabéri: battles, music videos and classes.',
    booking: { min: 200000, max: 600000, services: ['choregraphie', 'battle', 'cours-danse'], cities: ['Douala', 'Yaoundé'] } },
  { phone: '+237699000007', stageName: 'Ernest Bonanjo', city: 'Douala', discipline: 'peinture', categories: ['contemporaine'],
    tagline: 'La lumière de Douala sur la toile', bioFr: 'Peintre contemporain, Ernest travaille la lumière du Wouri à l’huile et au couteau.', bioEn: 'Contemporary painter capturing the light of the Wouri in oil.',
    booking: { min: 300000, services: ['peinture-live', 'commande-oeuvre', 'atelier'], cities: ['Douala'] } },
  { phone: '+237699000008', stageName: 'Kemi Street Art', city: 'Yaoundé', discipline: 'peinture', categories: ['urbain'],
    tagline: 'Les murs de la ville comme galerie', bioFr: 'Graffeuse et muraliste, Kemi colore les quartiers de Yaoundé.', bioEn: 'Graffiti artist and muralist bringing colour to Yaoundé.' },
];

/** Visuel abstrait : halos de lumière de scène aux couleurs de la discipline. */
async function stageArt(w: number, h: number, color: string, seed: number): Promise<Buffer> {
  const rand = (n: number) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2);
  const circles = Array.from({ length: 5 }, (_, i) => {
    const c = [color, brand.gold.$value, brand.terracotta.$value][i % 3];
    return `<circle cx="${(rand(i) * w).toFixed(0)}" cy="${(rand(i + 7) * h).toFixed(0)}" r="${(Math.max(w, h) * (0.25 + rand(i + 3) * 0.35)).toFixed(0)}" fill="${c}" opacity="${(0.35 + rand(i + 11) * 0.4).toFixed(2)}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${tokens.color.dark['surface-1'].$value}"/>${circles}</svg>`;
  return sharp(Buffer.from(svg)).blur(Math.round(Math.min(w, h) / 12)).jpeg({ quality: 90 }).toBuffer();
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const artists = app.get(ArtistsService);
  // Le badge est attribué par un compte d'équipe fictif, jamais par l'artiste lui-même.
  const curator = await prisma.user.upsert({
    where: { phone: '+237699000099' },
    create: { phone: '+237699000099', displayName: 'Équipe éditoriale (démo)', roles: ['FAN', 'MODERATOR'] },
    update: {},
  });
  let created = 0;
  for (const [i, d] of DEMOS.entries()) {
    const user = await prisma.user.upsert({ where: { phone: d.phone }, create: { phone: d.phone, displayName: d.stageName, city: d.city }, update: {} });
    const existing = await prisma.artistMember.findFirst({ where: { userId: user.id, role: 'OWNER' }, include: { artist: true } });
    if (existing) continue;
    const a = await artists.create(user.id, {
      stageName: d.stageName, city: d.city, type: d.type ?? 'INDIVIDUAL', disciplineSlugs: [d.discipline],
      categorySlugs: d.categories, bioFr: d.bioFr, bioEn: d.bioEn,
    });
    await artists.update(user.id, a.slug, { tagline: d.tagline, socialLinks: { instagram: `https://www.instagram.com/${a.slug.replace(/-/g, '')}`, tiktok: `https://www.tiktok.com/@${a.slug.replace(/-/g, '')}` } });
    await artists.setImage(user.id, a.slug, 'ARTIST_AVATAR', await stageArt(1024, 1024, disc[d.discipline].$value, i + 1));
    await artists.setImage(user.id, a.slug, 'ARTIST_BANNER', await stageArt(2400, 800, disc[d.discipline].$value, i + 101));
    if (d.booking) {
      await artists.setBookingProfile(user.id, a.slug, {
        isBookable: true, priceMinXaf: d.booking.min, priceMaxXaf: d.booking.max ?? null,
        travelCities: d.booking.cities, serviceTypes: d.booking.services, technicalRider: 'Sonorisation et éclairage fournis par l’organisateur.',
      });
    }
    if (d.verified) await artists.setVerified(curator.id, a.slug, true, 'Démonstration');
    created++;
  }
  console.log(`Démonstration : ${created} artiste(s) fictif(s) créé(s), ${DEMOS.length - created} déjà présent(s).`);
  await app.close();
}

void main();
