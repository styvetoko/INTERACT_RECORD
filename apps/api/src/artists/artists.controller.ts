import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ArtistType } from '@prisma/client';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public } from '../auth/decorators';
import { parse } from '../common/validation';
import { ArtistsService, MAX_DISCIPLINES_PER_ARTIST } from './artists.service';

const CreateArtistSchema = z.object({
  stageName: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(80),
  type: z.nativeEnum(ArtistType).default('INDIVIDUAL'),
  disciplineSlugs: z.array(z.string()).min(1).max(MAX_DISCIPLINES_PER_ARTIST),
  categorySlugs: z.array(z.string()).max(10).default([]),
  bioFr: z.string().trim().max(2000).optional(),
  bioEn: z.string().trim().max(2000).optional(),
});
const UpdateArtistSchema = CreateArtistSchema.pick({ stageName: true, city: true, bioFr: true, bioEn: true }).partial();

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.artists.create(user.id, parse(CreateArtistSchema, body));
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.artists.getBySlug(slug);
  }

  @Patch(':slug')
  update(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() body: unknown) {
    return this.artists.update(user.id, slug, parse(UpdateArtistSchema, body));
  }
}
