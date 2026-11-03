import { BadRequestException } from '@nestjs/common';
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
