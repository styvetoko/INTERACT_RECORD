import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ArtistType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { isReservedSlug, slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_OWNED_ARTISTS = 3;
export const MAX_DISCIPLINES_PER_ARTIST = 3;

const publicArtistInclude = {
  disciplines: { include: { discipline: { select: { slug: true, nameFr: true, nameEn: true } } } },
  categories: { include: { category: { select: { slug: true, nameFr: true, nameEn: true, discipline: { select: { slug: true } } } } } },
  _count: { select: { members: true } },
} satisfies Prisma.ArtistInclude;

type ArtistWithRelations = Prisma.ArtistGetPayload<{ include: typeof publicArtistInclude }>;

export function toPublicArtist(a: ArtistWithRelations) {
  return {
    id: a.id,
    slug: a.slug,
    stageName: a.stageName,
    type: a.type,
    country: a.country,
    city: a.city,
    bioFr: a.bioFr,
    bioEn: a.bioEn,
    avatarUrl: a.avatarUrl,
    bannerUrl: a.bannerUrl,
    verified: a.verified,
    memberCount: a._count.members,
    disciplines: a.disciplines.map((d) => d.discipline),
    categories: a.categories.map((c) => ({
      slug: c.category.slug, nameFr: c.category.nameFr, nameEn: c.category.nameEn, discipline: c.category.discipline.slug,
    })),
    createdAt: a.createdAt,
  };
}

export interface CreateArtistInput {
  stageName: string;
  city: string;
  type: ArtistType;
  disciplineSlugs: string[];
  categorySlugs: string[];
  bioFr?: string;
  bioEn?: string;
}

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** ACC-04 : un fan devient artiste (ou crée un collectif, ACC-07). */
  async create(userId: string, input: CreateArtistInput) {
    const owned = await this.prisma.artistMember.count({ where: { userId, role: 'OWNER' } });
    if (owned >= MAX_OWNED_ARTISTS) {
      throw new BadRequestException({ code: 'ARTIST_LIMIT', message: `Tu peux gérer au maximum ${MAX_OWNED_ARTISTS} profils artistes` });
    }

    const disciplineSlugs = [...new Set(input.disciplineSlugs)];
    const disciplines = await this.prisma.discipline.findMany({
      where: { slug: { in: disciplineSlugs }, enabled: true },
      include: { categories: { where: { enabled: true } } },
    });
    if (disciplines.length !== disciplineSlugs.length) {
      throw new BadRequestException({ code: 'DISCIPLINE_UNKNOWN', message: 'Discipline inconnue ou pas encore ouverte' });
    }

    // Une catégorie s'écrit « discipline/catégorie » ou simplement « catégorie » si elle est sans ambiguïté.
    const categoryIds: string[] = [];
    for (const raw of new Set(input.categorySlugs)) {
      const [dSlug, cSlug] = raw.includes('/') ? raw.split('/', 2) : [undefined, raw];
      const matches = disciplines
        .filter((d) => !dSlug || d.slug === dSlug)
        .flatMap((d) => d.categories.filter((c) => c.slug === cSlug));
      if (matches.length !== 1) {
        throw new BadRequestException({ code: 'CATEGORY_UNKNOWN', message: `Catégorie inconnue ou ambiguë : ${raw}` });
      }
      categoryIds.push(matches[0].id);
    }

    const slug = await this.uniqueSlug(input.stageName);
    const artist = await this.prisma.$transaction(async (tx) => {
      const created = await tx.artist.create({
        data: {
          slug,
          stageName: input.stageName,
          city: input.city,
          type: input.type,
          bioFr: input.bioFr,
          bioEn: input.bioEn,
          members: { create: { userId, role: 'OWNER' } },
          disciplines: { create: disciplines.map((d) => ({ disciplineId: d.id })) },
          categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        },
        include: publicArtistInclude,
      });
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
      if (!user.roles.includes('ARTIST')) {
        await tx.user.update({ where: { id: userId }, data: { roles: { push: 'ARTIST' } } });
      }
      await this.audit.log({ actorId: userId, action: 'artist.create', entityType: 'Artist', entityId: created.id, data: { slug } }, tx);
      return created;
    });
    return toPublicArtist(artist);
  }

  async getBySlug(slug: string) {
    const artist = await this.prisma.artist.findUnique({ where: { slug }, include: publicArtistInclude });
    if (!artist) throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artiste introuvable' });
    return toPublicArtist(artist);
  }

  async update(userId: string, slug: string, input: Partial<Pick<CreateArtistInput, 'stageName' | 'city' | 'bioFr' | 'bioEn'>>) {
    const artist = await this.prisma.artist.findUnique({ where: { slug }, include: { members: true } });
    if (!artist) throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artiste introuvable' });
    const member = artist.members.find((m) => m.userId === userId);
    const allowed = member && (member.role === 'OWNER' || member.permissions.includes('profile.edit'));
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Tu ne peux pas modifier ce profil' });

    const updated = await this.prisma.artist.update({ where: { id: artist.id }, data: input, include: publicArtistInclude });
    await this.audit.log({ actorId: userId, action: 'artist.update', entityType: 'Artist', entityId: artist.id, data: { changes: Object.keys(input) } });
    return toPublicArtist(updated);
  }

  /** Trouve un identifiant d'URL libre : nom-de-scene, nom-de-scene-2, … */
  private async uniqueSlug(stageName: string): Promise<string> {
    let base = slugify(stageName);
    if (base.length < 2 || isReservedSlug(base)) base = `artiste-${base || 'nouveau'}`.replace(/-+$/, '');
    const taken = new Set(
      (await this.prisma.artist.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((a) => a.slug),
    );
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
  }
}
