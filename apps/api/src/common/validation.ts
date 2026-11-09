import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/** Valide une entrée avec un schéma zod ; renvoie une erreur 400 lisible sinon. */
export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Données invalides',
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID.test(value);

/** Paramètre d'URL qui doit être un identifiant UUID ; sinon erreur 400 avec un code stable. */
@Injectable()
export class UuidParam implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUuid(value)) throw new BadRequestException({ code: 'ID_INVALID', message: 'Identifiant invalide' });
    return value;
  }
}
