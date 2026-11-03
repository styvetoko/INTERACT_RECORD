import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ContentFormat } from '@prisma/client';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, Roles } from '../auth/decorators';
import { parse } from '../common/validation';
import { DisciplinesService } from './disciplines.service';
import { MetadataSchemaDefinition } from './metadata-schema';

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'identifiant en minuscules et tirets').max(40);
const CreateDisciplineSchema = z.object({
  slug,
  nameFr: z.string().min(2).max(60),
  nameEn: z.string().min(2).max(60),
  enabled: z.boolean().default(false),
  allowedFormats: z.array(z.nativeEnum(ContentFormat)).min(1),
  metadataSchema: MetadataSchemaDefinition.default([]),
  sortOrder: z.number().int().optional(),
});
const UpdateDisciplineSchema = CreateDisciplineSchema.omit({ slug: true }).partial();
const CreateCategorySchema = z.object({
  slug,
  nameFr: z.string().min(2).max(60),
  nameEn: z.string().min(2).max(60),
  sortOrder: z.number().int().optional(),
});

@Controller()
export class DisciplinesController {
  constructor(private readonly disciplines: DisciplinesService) {}

  @Public()
  @Get('disciplines')
  list() {
    return this.disciplines.list();
  }

  @Public()
  @Get('disciplines/:slug')
  get(@Param('slug') slugParam: string) {
    return this.disciplines.getBySlug(slugParam);
  }

  @Roles('ADMIN', 'EDITOR')
  @Get('admin/disciplines')
  listAll(@Query('includeDisabled') _?: string) {
    return this.disciplines.list(true);
  }

  @Roles('ADMIN')
  @Post('admin/disciplines')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.disciplines.create(user.id, parse(CreateDisciplineSchema, body));
  }

  @Roles('ADMIN')
  @Patch('admin/disciplines/:slug')
  update(@CurrentUser() user: AuthUser, @Param('slug') slugParam: string, @Body() body: unknown) {
    return this.disciplines.update(user.id, slugParam, parse(UpdateDisciplineSchema, body));
  }

  @Roles('ADMIN', 'EDITOR')
  @Post('admin/disciplines/:slug/categories')
  addCategory(@CurrentUser() user: AuthUser, @Param('slug') slugParam: string, @Body() body: unknown) {
    return this.disciplines.addCategory(user.id, slugParam, parse(CreateCategorySchema, body));
  }
}
