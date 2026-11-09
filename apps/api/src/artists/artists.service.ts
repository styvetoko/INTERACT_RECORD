import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ArtistType, ImagePurpose, Prisma } from '@prisma/client';
import QRCode from 'qrcode';
import tokens from '@interact/design-tokens/tokens.json';
import { AuditService } from '../audit/audit.service';
import { afterCursor, newestFirst, Page, toPage } from '../common/pagination';
import { isReservedSlug, normalizeForSearch, slugify } from '../common/slug';
import { env } from '../config/env';
import { MediaService, PublicImage } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingProfileInput } from './booking-profile';
import { computeCompleteness } from './completeness';
import { mergeSocialLinks, SocialLinks, SocialNetwork } from './social-links';

export const MAX_OWNED_ARTISTS = 3;
export const MAX_DISCIPLINES_PER_ARTIST = 3;

const artistInclude = {
  disciplines: { include: { discipline: { select: { slug: true, nameFr: true, nameEn: true } } } },
  categories: { include: { category: { select: { slug: true, nameFr: true, nameEn: true, discipline: { select: { slug: true } } } } } },
  avatarImage: true,
  bannerImage: true,
  bookingProfile: true,
  _count: { select: { members: true } },
} satisfies Prisma.ArtistInclude;

type ArtistFull = Prisma.ArtistGetPayload<{ include: typeof artistInclude }>;

const cardInclude = {
  disciplines: { include: { discipline: { select: { slug: true } } } },
  avatarImage: true,
} satisfies Prisma.ArtistInclude;

type ArtistCard = Prisma.ArtistGetPayload<{ include: typeof cardInclude }>;

export interface CreateArtistInput {
  stageName: string;
  city: string;
  type: ArtistType;
  disciplineSlugs: string[];
  categorySlugs: string[];
  bioFr?: string;
  bioEn?: string;
}

export interface UpdateArtistInput {
  stageName?: string;
  city?: string;
  bioFr?: string | null;
  bioEn?: string | null;
  tagline?: string | null;
  socialLinks?: Partial<Record<SocialNetwork, string | null | undefined>>;
}

export interface ListArtistsQuery {
  discipline?: string;
  city?: string;
  q?: string;
  limit: number;
  cursor?: string;
}

/** Droits fins d'un membre sur un profil artiste (MGR-01). */
export type ArtistPermission = 'profile.edit';

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
  ) {}

  shareUrl(slug: string): string {
    return `${env().PUBLIC_WEB_URL.replace(/\/$/, '')}/${slug}`;
  }

  /** Vue publique : chaque champ exposé est choisi explicitement (jamais de numéro ni d'identifiant de membre). */
  toPublic(a: ArtistFull) {
    const booking = a.bookingProfile?.isBookable
      ? {
          priceMinXaf: a.bookingProfile.priceMinXaf,
          priceMaxXaf: a.bookingProfile.priceMaxXaf,
          travelCities: a.bookingProfile.travelCities,
          serviceTypes: a.bookingProfile.serviceTypes,
          technicalRider: a.bookingProfile.technicalRider,
        }
      : null;
    return {
      id: a.id,
      slug: a.slug,
      stageName: a.stageName,
      type: a.type,
      country: a.country,
      city: a.city,
      tagline: a.tagline,
      bioFr: a.bioFr,
      bioEn: a.bioEn,
      avatar: this.media.toPublic(a.avatarImage),
      banner: this.media.toPublic(a.bannerImage),
      socialLinks: a.socialLinks as SocialLinks,
      verified: a.verified,
      memberCount: a._count.members,
      disciplines: a.disciplines.map((d) => d.discipline),
      categories: a.categories.map((c) => ({
        slug: c.category.slug,
        nameFr: c.category.nameFr,
        nameEn: c.category.nameEn,
        discipline: c.category.discipline.slug,
      })),
      booking,
      shareUrl: this.shareUrl(a.slug),
      createdAt: a.createdAt,
    };
  }

  private toCard(a: ArtistCard): {
    id: string; slug: string; stageName: string; city: string; tagline: string | null;
    verified: boolean; disciplines: string[]; avatar: PublicImage | null;
  } {
    return {
      id: a.id,
      slug: a.slug,
      stageName: a.stageName,
      city: a.city,
      tagline: a.tagline,
      verified: a.verified,
      disciplines: a.disciplines.map((d) => d.discipline.slug),
      avatar: this.media.toPublic(a.avatarImage),
    };
  }

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
          searchName: normalizeForSearch(input.stageName),
          city: input.city,
          type: input.type,
          bioFr: input.bioFr,
          bioEn: input.bioEn,
          members: { create: { userId, role: 'OWNER' } },
          disciplines: { create: disciplines.map((d) => ({ disciplineId: d.id })) },
          categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        },
        include: artistInclude,
      });
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
      if (!user.roles.includes('ARTIST')) {
        await tx.user.update({ where: { id: userId }, data: { roles: { push: 'ARTIST' } } });
      }
      await this.audit.log({ actorId: userId, action: 'artist.create', entityType: 'Artist', entityId: created.id, data: { slug } }, tx);
      return created;
    });
    return this.toPublic(artist);
  }

  async getBySlug(slug: string) {
    return this.toPublic(await this.findOrFail(slug));
  }

  /** Annuaire public (DEC-05 partiel) : filtres discipline, ville, nom ; pagination par curseur. */
  async list(query: ListArtistsQuery): Promise<Page<ReturnType<ArtistsService['toCard']>>> {
    const where: Prisma.ArtistWhereInput = {
      ...afterCursor(query.cursor),
      ...(query.discipline ? { disciplines: { some: { discipline: { slug: query.discipline, enabled: true } } } } : {}),
      ...(query.city ? { city: { equals: query.city.trim(), mode: 'insensitive' } } : {}),
      ...(query.q ? { searchName: { contains: normalizeForSearch(query.q) } } : {}),
    };
    const rows = await this.prisma.artist.findMany({
      where,
      orderBy: newestFirst,
      take: query.limit + 1,
      include: cardInclude,
    });
    return toPage(rows, query.limit, (r) => this.toCard(r));
  }

  async update(userId: string, slug: string, input: UpdateArtistInput) {
    const artist = await this.findForMember(userId, slug, 'profile.edit');
    const { socialLinks, ...fields } = input;
    const updated = await this.prisma.artist.update({
      where: { id: artist.id },
      data: {
        ...fields,
        ...(fields.stageName ? { searchName: normalizeForSearch(fields.stageName) } : {}),
        ...(socialLinks ? { socialLinks: mergeSocialLinks(artist.socialLinks, socialLinks) as Prisma.InputJsonValue } : {}),
      },
      include: artistInclude,
    });
    await this.audit.log({ actorId: userId, action: 'artist.update', entityType: 'Artist', entityId: artist.id, data: { changes: Object.keys(input) } });
    return this.toPublic(updated);
  }

  /** PRO-06 : fiche booking. */
  async setBookingProfile(userId: string, slug: string, input: BookingProfileInput) {
    const artist = await this.findForMember(userId, slug, 'profile.edit');
    const data = {
      isBookable: input.isBookable,
      priceMinXaf: input.priceMinXaf ?? null,
      priceMaxXaf: input.priceMaxXaf ?? null,
      travelCities: [...new Set(input.travelCities)],
      serviceTypes: [...new Set(input.serviceTypes)],
      technicalRider: input.technicalRider ?? null,
    };
    await this.prisma.artistBookingProfile.upsert({
      where: { artistId: artist.id },
      create: { artistId: artist.id, ...data },
      update: data,
    });
    await this.audit.log({ actorId: userId, action: 'artist.booking_profile', entityType: 'Artist', entityId: artist.id, data: { isBookable: input.isBookable } });
    return this.getBySlug(slug);
  }

  /** PRO-01 : photo de profil ou bannière. L'ancienne image est supprimée après le remplacement. */
  async setImage(userId: string, slug: string, purpose: ImagePurpose, file: Buffer) {
    const artist = await this.findForMember(userId, slug, 'profile.edit');
    const image = await this.media.createImage(userId, purpose, file);
    const field = purpose === 'ARTIST_AVATAR' ? 'avatarImageId' : 'bannerImageId';
    const previousId = artist[field];
    try {
      await this.prisma.artist.update({ where: { id: artist.id }, data: { [field]: image.id } });
    } catch (e) {
      await this.media.deleteImage(image.id);
      throw e;
    }
    if (previousId) await this.media.deleteImage(previousId);
    await this.audit.log({ actorId: userId, action: `artist.${purpose === 'ARTIST_AVATAR' ? 'avatar' : 'banner'}.set`, entityType: 'Artist', entityId: artist.id });
    return this.getBySlug(slug);
  }

  async removeImage(userId: string, slug: string, purpose: ImagePurpose) {
    const artist = await this.findForMember(userId, slug, 'profile.edit');
    const field = purpose === 'ARTIST_AVATAR' ? 'avatarImageId' : 'bannerImageId';
    const previousId = artist[field];
    if (previousId) {
      await this.prisma.artist.update({ where: { id: artist.id }, data: { [field]: null } });
      await this.media.deleteImage(previousId);
      await this.audit.log({ actorId: userId, action: `artist.${purpose === 'ARTIST_AVATAR' ? 'avatar' : 'banner'}.remove`, entityType: 'Artist', entityId: artist.id });
    }
    return this.getBySlug(slug);
  }

  /** Vue de gestion (membres seulement) : vue publique + jauge de complétude + fiche booking complète + membres. */
  async getManageView(userId: string, slug: string) {
    await this.findForMember(userId, slug);
    const artist = await this.findOrFail(slug);
    const members = await this.prisma.artistMember.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, displayName: true } } },
    });
    return {
      ...this.toPublic(artist),
      bookingProfile: artist.bookingProfile
        ? {
            isBookable: artist.bookingProfile.isBookable,
            priceMinXaf: artist.bookingProfile.priceMinXaf,
            priceMaxXaf: artist.bookingProfile.priceMaxXaf,
            travelCities: artist.bookingProfile.travelCities,
            serviceTypes: artist.bookingProfile.serviceTypes,
            technicalRider: artist.bookingProfile.technicalRider,
          }
        : null,
      completeness: computeCompleteness({
        hasAvatar: !!artist.avatarImageId,
        hasBanner: !!artist.bannerImageId,
        hasBio: !!(artist.bioFr?.trim() || artist.bioEn?.trim()),
        hasTagline: !!artist.tagline?.trim(),
        categoryCount: artist.categories.length,
        socialLinkCount: Object.keys(artist.socialLinks as object).length,
        hasBookingProfile: !!artist.bookingProfile,
      }),
      members: members.map((m) => ({
        userId: m.user.id,
        displayName: m.user.displayName,
        role: m.role,
        permissions: m.permissions,
      })),
    };
  }

  /** PRO-04 : QR code du lien de partage, sombre sur clair pour être lisible par tous les téléphones. */
  async qrCodeSvg(slug: string): Promise<string> {
    const artist = await this.prisma.artist.findUnique({ where: { slug }, select: { slug: true } });
    if (!artist) throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artiste introuvable' });
    return QRCode.toString(this.shareUrl(artist.slug), {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: { dark: tokens.color.brand['on-gold'].$value, light: tokens.color.light['surface-1'].$value },
    });
  }

  /** ACC-06 : badge « artiste vérifié », attribué ou retiré par l'équipe, avec motif. */
  async setVerified(actorId: string, slug: string, verified: boolean, reason: string) {
    const artist = await this.prisma.artist.findUnique({ where: { slug } });
    if (!artist) throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artiste introuvable' });
    await this.prisma.artist.update({
      where: { id: artist.id },
      data: { verified, verifiedAt: verified ? new Date() : null },
    });
    await this.audit.log({
      actorId,
      action: verified ? 'artist.verify' : 'artist.unverify',
      entityType: 'Artist',
      entityId: artist.id,
      data: { reason },
    });
    return this.getBySlug(slug);
  }

  private async findOrFail(slug: string): Promise<ArtistFull> {
    const artist = await this.prisma.artist.findUnique({ where: { slug }, include: artistInclude });
    if (!artist) throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artiste introuvable' });
    return artist;
  }

  /** Vérifie que l'utilisateur est membre du profil (et a le droit demandé, sauf s'il est propriétaire). */
  private async findForMember(userId: string, slug: string, permission?: ArtistPermission) {
    const artist = await this.prisma.artist.findUnique({ where: { slug }, include: { members: true } });
    if (!artist) throw new NotFoundException({ code: 'ARTIST_NOT_FOUND', message: 'Artiste introuvable' });
    const member = artist.members.find((m) => m.userId === userId);
    const allowed = member && (member.role === 'OWNER' || !permission || member.permissions.includes(permission));
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Tu ne peux pas modifier ce profil' });
    return artist;
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
