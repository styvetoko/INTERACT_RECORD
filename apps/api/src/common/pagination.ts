import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

interface CursorKey {
  createdAt: Date;
  id: string;
}

/** Curseur opaque : position dans un tri (createdAt décroissant, id décroissant). */
export function encodeCursor(key: CursorKey): string {
  return Buffer.from(`${key.createdAt.toISOString()}|${key.id}`).toString('base64url');
}

export function decodeCursor(cursor: string): CursorKey {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = new Date(iso ?? '');
  if (!id || Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/.test(id)) {
    throw new BadRequestException({ code: 'CURSOR_INVALID', message: 'Curseur de pagination invalide' });
  }
  return { createdAt, id };
}

/** Condition Prisma « après le curseur » pour un tri décroissant. */
export function afterCursor(cursor?: string) {
  if (!cursor) return {};
  const { createdAt, id } = decodeCursor(cursor);
  return { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] };
}

export const newestFirst = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

/** Construit la page à partir de limit + 1 lignes lues. */
export function toPage<R extends CursorKey, T>(rows: R[], limit: number, map: (r: R) => T): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items: items.map(map), nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null };
}
