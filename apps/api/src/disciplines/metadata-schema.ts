import { ContentFormat } from '@prisma/client';
import { z } from 'zod';

/**
 * Métadonnées propres à une discipline, décrites en configuration (section 5.1).
 * Ajouter un champ à une discipline = modifier sa configuration, pas le code.
 */
export const FIELD_TYPES = ['text', 'longtext', 'number', 'integer', 'boolean', 'date', 'select', 'multiselect', 'url'] as const;

const OptionSchema = z.object({
  value: z.string().min(1).max(60),
  labelFr: z.string().min(1).max(80),
  labelEn: z.string().min(1).max(80),
});

export const MetadataFieldSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-zA-Z0-9]{0,39}$/, 'clé en camelCase, 40 caractères max'),
    labelFr: z.string().min(1).max(80),
    labelEn: z.string().min(1).max(80),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    options: z.array(OptionSchema).max(200).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    maxLength: z.number().int().positive().max(10_000).optional(),
    /** Si présent, le champ ne s'applique qu'à ces formats (ex. BPM seulement pour l'audio). */
    appliesTo: z.array(z.nativeEnum(ContentFormat)).optional(),
    /** Le champ devient un filtre de recherche. */
    searchable: z.boolean().default(false),
  })
  .superRefine((field, ctx) => {
    const needsOptions = field.type === 'select' || field.type === 'multiselect';
    if (needsOptions && !field.options?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `le champ ${field.key} doit avoir des options` });
    }
    if (!needsOptions && field.options) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `le champ ${field.key} ne prend pas d'options` });
    }
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `le champ ${field.key} a un min supérieur au max` });
    }
  });

export const MetadataSchemaDefinition = z.array(MetadataFieldSchema).max(60).superRefine((fields, ctx) => {
  const seen = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.key)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `clé en double : ${f.key}` });
    seen.add(f.key);
  }
});

export type MetadataField = z.infer<typeof MetadataFieldSchema>;

function fieldValidator(field: MetadataField): z.ZodTypeAny {
  let v: z.ZodTypeAny;
  switch (field.type) {
    case 'text':
    case 'longtext': {
      let s = z.string().trim();
      s = s.max(field.maxLength ?? (field.type === 'text' ? 200 : 5000));
      v = field.required ? s.min(1) : s;
      break;
    }
    case 'number':
    case 'integer': {
      let n = field.type === 'integer' ? z.number().int() : z.number();
      if (field.min !== undefined) n = n.min(field.min);
      if (field.max !== undefined) n = n.max(field.max);
      v = n;
      break;
    }
    case 'boolean':
      v = z.boolean();
      break;
    case 'date':
      v = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date au format AAAA-MM-JJ');
      break;
    case 'url':
      v = z.string().url().max(500);
      break;
    case 'select': {
      const values = (field.options ?? []).map((o) => o.value);
      v = z.string().refine((x) => values.includes(x), 'valeur non autorisée');
      break;
    }
    case 'multiselect': {
      const values = (field.options ?? []).map((o) => o.value);
      let a = z.array(z.string().refine((x) => values.includes(x), 'valeur non autorisée'));
      if (field.required) a = a.min(1);
      v = a;
      break;
    }
  }
  return field.required ? v : v.optional();
}

/** Construit le validateur des métadonnées d'une œuvre pour un format donné. */
export function buildMetadataValidator(fields: MetadataField[], format?: ContentFormat) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (format && field.appliesTo && !field.appliesTo.includes(format)) continue;
    shape[field.key] = fieldValidator(field);
  }
  return z.object(shape).strict();
}

export type MetadataResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: { path: string; message: string }[] };

export function validateMetadata(fields: MetadataField[], data: unknown, format?: ContentFormat): MetadataResult {
  const result = buildMetadataValidator(fields, format).safeParse(data ?? {});
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  };
}
