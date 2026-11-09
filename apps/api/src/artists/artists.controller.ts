import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtistType, ImagePurpose } from '@prisma/client';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, Roles } from '../auth/decorators';
import { PageQuerySchema } from '../common/pagination';
import { parse } from '../common/validation';
import { MAX_UPLOAD_BYTES } from '../media/image-processing';
import { UploadErrorsInterceptor } from '../media/upload-errors.interceptor';
import { ArtistsService, MAX_DISCIPLINES_PER_ARTIST } from './artists.service';
import { BOOKING_SERVICE_TYPES, BookingProfileSchema } from './booking-profile';
import { SocialLinksPatchSchema } from './social-links';

const CreateArtistSchema = z.object({
  stageName: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(80),
  type: z.nativeEnum(ArtistType).default('INDIVIDUAL'),
  disciplineSlugs: z.array(z.string().max(40)).min(1).max(MAX_DISCIPLINES_PER_ARTIST),
  categorySlugs: z.array(z.string().max(80)).max(10).default([]),
  bioFr: z.string().trim().max(2000).optional(),
  bioEn: z.string().trim().max(2000).optional(),
});

const UpdateArtistSchema = z
  .object({
    stageName: z.string().trim().min(2).max(60),
    city: z.string().trim().min(2).max(80),
    bioFr: z.string().trim().max(2000).nullable(),
    bioEn: z.string().trim().max(2000).nullable(),
    tagline: z.string().trim().max(80).nullable(),
    socialLinks: SocialLinksPatchSchema,
    categorySlugs: z.array(z.string().max(80)).max(10),
  })
  .partial()
  .strict();

const ListArtistsSchema = PageQuerySchema.extend({
  discipline: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
  q: z.string().trim().min(1).max(60).optional(),
});

const VerificationSchema = z.object({ verified: z.boolean(), reason: z.string().trim().min(5).max(500) });

/** Un seul fichier, aucun champ texte : rien d'autre n'est lu en mémoire. */
const uploadOptions = {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 1, fieldSize: 1024, fieldNameSize: 100, headerPairs: 50 },
};
/** Envois d'images : 30 par heure, le traitement est coûteux. */
const UPLOAD_THROTTLE = { default: { limit: 30, ttl: 60 * 60_000 } };

function requireFile(file: Express.Multer.File | undefined): Buffer {
  if (!file?.buffer?.length) {
    throw new BadRequestException({ code: 'FILE_MISSING', message: 'Ajoute un fichier dans le champ « file »' });
  }
  return file.buffer;
}

@Controller()
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Public()
  @Get('reference/booking-service-types')
  bookingServiceTypes() {
    return BOOKING_SERVICE_TYPES;
  }

  @Public()
  @Get('artists')
  list(@Query() query: unknown) {
    return this.artists.list(parse(ListArtistsSchema, query));
  }

  @Post('artists')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.artists.create(user.id, parse(CreateArtistSchema, body));
  }

  @Public()
  @Get('artists/:slug')
  get(@Param('slug') slug: string) {
    return this.artists.getBySlug(slug);
  }

  @Public()
  @Get('artists/:slug/qr.svg')
  async qr(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const svg = await this.artists.qrCodeSvg(slug);
    // En-têtes posés seulement en cas de succès : une erreur reste du JSON.
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return svg;
  }

  @Get('artists/:slug/manage')
  manage(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.artists.getManageView(user.id, slug);
  }

  @Patch('artists/:slug')
  update(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() body: unknown) {
    return this.artists.update(user.id, slug, parse(UpdateArtistSchema, body));
  }

  @Put('artists/:slug/booking-profile')
  bookingProfile(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() body: unknown) {
    return this.artists.setBookingProfile(user.id, slug, parse(BookingProfileSchema, body));
  }

  @Put('artists/:slug/avatar')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(UploadErrorsInterceptor, FileInterceptor('file', uploadOptions))
  setAvatar(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @UploadedFile() file?: Express.Multer.File) {
    return this.artists.setImage(user.id, slug, ImagePurpose.ARTIST_AVATAR, requireFile(file));
  }

  @Put('artists/:slug/banner')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(UploadErrorsInterceptor, FileInterceptor('file', uploadOptions))
  setBanner(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @UploadedFile() file?: Express.Multer.File) {
    return this.artists.setImage(user.id, slug, ImagePurpose.ARTIST_BANNER, requireFile(file));
  }

  @Delete('artists/:slug/avatar')
  removeAvatar(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.artists.removeImage(user.id, slug, ImagePurpose.ARTIST_AVATAR);
  }

  @Delete('artists/:slug/banner')
  removeBanner(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.artists.removeImage(user.id, slug, ImagePurpose.ARTIST_BANNER);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Post('admin/artists/:slug/verification')
  @HttpCode(200)
  verify(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() body: unknown) {
    const dto = parse(VerificationSchema, body);
    return this.artists.setVerified(user.id, slug, dto.verified, dto.reason);
  }
}
