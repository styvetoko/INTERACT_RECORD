import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentFormat, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetadataField, MetadataSchemaDefinition } from './metadata-schema';

const withCategories = {
  categories: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.DisciplineInclude;

@Injectable()
export class DisciplinesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(includeDisabled = false) {
    return this.prisma.discipline.findMany({
      where: includeDisabled ? {} : { enabled: true },
      orderBy: { sortOrder: 'asc' },
      include: withCategories,
    });
  }

  async getBySlug(slug: string, includeDisabled = false) {
    const d = await this.prisma.discipline.findUnique({ where: { slug }, include: withCategories });
    if (!d || (!d.enabled && !includeDisabled)) {
      throw new NotFoundException({ code: 'DISCIPLINE_NOT_FOUND', message: 'Discipline introuvable' });
    }
    return d;
  }

  async metadataFields(disciplineId: string): Promise<MetadataField[]> {
    const d = await this.prisma.discipline.findUniqueOrThrow({ where: { id: disciplineId } });
    return MetadataSchemaDefinition.parse(d.metadataSchema);
  }

  async create(actorId: string, input: {
    slug: string; nameFr: string; nameEn: string; enabled: boolean;
    allowedFormats: ContentFormat[]; metadataSchema: MetadataField[]; sortOrder?: number;
  }) {
    const exists = await this.prisma.discipline.findUnique({ where: { slug: input.slug } });
    if (exists) throw new ConflictException({ code: 'DISCIPLINE_EXISTS', message: 'Cette discipline existe déjà' });
    const created = await this.prisma.discipline.create({
      data: { ...input, metadataSchema: input.metadataSchema as unknown as Prisma.InputJsonValue },
      include: withCategories,
    });
    await this.audit.log({ actorId, action: 'discipline.create', entityType: 'Discipline', entityId: created.id, data: { slug: input.slug } });
    return created;
  }

  async update(actorId: string, slug: string, input: Partial<{
    nameFr: string; nameEn: string; enabled: boolean; allowedFormats: ContentFormat[];
    metadataSchema: MetadataField[]; sortOrder: number;
  }>) {
    const current = await this.getBySlug(slug, true);
    const updated = await this.prisma.discipline.update({
      where: { id: current.id },
      data: {
        ...input,
        metadataSchema: input.metadataSchema as unknown as Prisma.InputJsonValue | undefined,
      },
      include: withCategories,
    });
    await this.audit.log({ actorId, action: 'discipline.update', entityType: 'Discipline', entityId: current.id, data: { changes: Object.keys(input) } });
    return updated;
  }

  async addCategory(actorId: string, disciplineSlug: string, input: { slug: string; nameFr: string; nameEn: string; sortOrder?: number }) {
    const d = await this.getBySlug(disciplineSlug, true);
    try {
      const category = await this.prisma.category.create({ data: { ...input, disciplineId: d.id } });
      await this.audit.log({ actorId, action: 'category.create', entityType: 'Category', entityId: category.id, data: { discipline: disciplineSlug, slug: input.slug } });
      return category;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({ code: 'CATEGORY_EXISTS', message: 'Cette catégorie existe déjà' });
      }
      throw e;
    }
  }
}

